import { appendFile, mkdir, rename, rm, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { sanitizeRangeErrorEvidence, type RangeErrorEvidence } from './runtime-failure-evidence.js'

/** Retain only error categories, never messages, prompts, URLs or credentials. */
export function diagnosticError(error: unknown): { kind: string; code?: string; httpStatus?: number } {
  const names = new Set(['AbortError', 'TimeoutError', 'TypeError', 'SyntaxError', 'RangeError', 'Error'])
  let current = error
  let kind = 'Error'
  let code: string | undefined
  let httpStatus: number | undefined
  for (let depth = 0; depth < 5 && typeof current === 'object' && current !== null; depth++) {
    const value = current as { name?: unknown; code?: unknown; status?: unknown; cause?: unknown }
    if (typeof value.name === 'string' && names.has(value.name)) kind = value.name
    if (typeof value.code === 'string' && /^(?:E[A-Z0-9_]{2,36}|UND_ERR_[A-Z_]{1,32}|TRANSPORT|RATE_LIMIT|HTTP_ERROR)$/u.test(value.code)) code = value.code
    if (typeof value.status === 'number' && Number.isInteger(value.status) && value.status >= 100 && value.status <= 599) httpStatus = value.status
    current = value.cause
  }
  return { kind, ...(code ? { code } : {}), ...(httpStatus ? { httpStatus } : {}) }
}

export interface DiagnosticRecord {
  event: 'runtime.start' | 'runtime.stop' | 'image.start' | 'image.success' | 'image.failure' | 'llm.failure' | 'turn.end' | 'provider.probe'
    | 'native.open' | 'native.close' | 'native.failure' | 'native.auth.failure' | 'native.session-list.timeout' | 'native.session-list.complete' | 'media.preview' | 'media.failure'
    | 'video.submit' | 'video.success' | 'video.failure' | 'sse.open' | 'sse.close' | 'client.connection' | 'client.runtime.failure' | 'room.select.stage'
  stream?: 'room' | 'notifications'
  heartbeatCount?: number
  connectionState?: { native: string; room: string; notifications: string; visible: boolean; online: boolean }
  reason?: 'peer-end' | 'socket-error' | 'transport-close' | 'plugin-stop' | 'auth-failed'
  operationId?: string
  sessionId?: string
  elapsedMs?: number
  bytes?: number
  outcome?: string
  providerPid?: number
  healthy?: boolean
  error?: ReturnType<typeof diagnosticError>
  /** Browser runtime failure source; no browser message, stack, URL, or user content. */
  clientRuntime?: { source: 'window-error' | 'unhandled-rejection' | 'room-selection'; rangeError?: RangeErrorEvidence }
  /** De-identified room-selection timing; stage names only, never room/session/identity data. */
  roomSelection?: {
    stage: 'enter' | 'authentication' | 'ensure' | 'cached' | 'header' | 'inspect' | 'resume' | 'attach' | 'response' | 'exception'
    outcome: 'start' | 'complete' | 'failure'
    elapsedMs: number
    closed?: boolean
  }
  /** De-identified cumulative-from-request-start stages for native session catalogue diagnostics only. */
  sessionList?: {
    upstreamElapsedMs?: number
    jsonElapsedMs?: number
    filterElapsedMs?: number
    itemsCount?: number
    deadlineAbortElapsedMs?: number
    totalElapsedMs?: number
    status?: number
  }
}

/** Observe failures without changing retry policy, chunks or thrown error identity. */
export async function* diagnosticStream<T>(source: AsyncIterable<T>, journal: DiagnosticJournal, sessionId: string): AsyncGenerator<T> {
  const started = Date.now()
  try { yield* source }
  catch (error) {
    journal.record({ event: 'llm.failure', sessionId, elapsedMs: Date.now() - started, error: diagnosticError(error) })
    throw error
  }
}

/** Bounded serialized journal. Disk failures degrade evidence, never the chat runtime. */
export class DiagnosticJournal {
  private queue: Promise<void> = Promise.resolve()
  private pending = 0
  private healthy = true
  private dropped = 0
  readonly directory: string | undefined
  constructor(directory = '', private readonly limit = 2 * 1024 * 1024) {
    this.directory = directory === ':memory:' ? undefined
      : join(directory || resolve(process.env.DSH_HOME?.trim() || join(homedir(), '.dsh'), 'chatroom'), 'diagnostics')
  }
  get status() { return { enabled: this.directory !== undefined, healthy: this.healthy, dropped: this.dropped } }
  record(record: DiagnosticRecord): void {
    if (!this.directory) return
    if (this.pending >= 256) { this.dropped++; this.healthy = false; return }
    const safe = {
      version: 1, at: new Date().toISOString(), pid: process.pid, event: record.event,
      operationId: record.operationId?.slice(0, 80), sessionId: record.sessionId?.slice(0, 256),
      elapsedMs: record.elapsedMs, bytes: record.bytes,
      providerPid: record.providerPid, healthy: record.healthy,
      stream: ['room', 'notifications'].includes(record.stream ?? '') ? record.stream : undefined,
      heartbeatCount: record.heartbeatCount,
      connectionState: record.connectionState === undefined ? undefined : {
        native: ['connected', 'connecting', 'disconnected'].includes(record.connectionState.native) ? record.connectionState.native : 'unknown',
        room: ['online', 'connecting', 'offline'].includes(record.connectionState.room) ? record.connectionState.room : 'unknown',
        notifications: ['online', 'connecting', 'offline'].includes(record.connectionState.notifications) ? record.connectionState.notifications : 'unknown',
        visible: record.connectionState.visible === true, online: record.connectionState.online === true,
      },
      reason: ['peer-end', 'socket-error', 'transport-close', 'plugin-stop', 'auth-failed'].includes(record.reason ?? '') ? record.reason : undefined,
      outcome: ['success', 'error', 'cancelled', 'completed', 'aborted', 'interrupted'].includes(record.outcome ?? '') ? record.outcome : undefined,
      error: record.error === undefined ? undefined : diagnosticError({ name: record.error.kind, code: record.error.code, status: record.error.httpStatus }),
      clientRuntime: record.event !== 'client.runtime.failure' || record.clientRuntime === undefined ? undefined : {
        source: ['window-error', 'unhandled-rejection', 'room-selection'].includes(record.clientRuntime.source)
          ? record.clientRuntime.source : undefined,
        ...(record.error?.kind === 'RangeError' && record.clientRuntime.rangeError !== undefined
          ? { rangeError: sanitizeRangeErrorEvidence(record.clientRuntime.rangeError) }
          : {}),
      },
      roomSelection: record.event !== 'room.select.stage' || record.roomSelection === undefined ? undefined : {
        stage: ['enter', 'authentication', 'ensure', 'cached', 'header', 'inspect', 'resume', 'attach', 'response', 'exception'].includes(record.roomSelection.stage)
          ? record.roomSelection.stage : undefined,
        outcome: ['start', 'complete', 'failure'].includes(record.roomSelection.outcome)
          ? record.roomSelection.outcome : undefined,
        elapsedMs: safeElapsed(record.roomSelection.elapsedMs),
        closed: record.roomSelection.closed === true ? true : undefined,
      },
      sessionList: !['native.session-list.timeout', 'native.session-list.complete'].includes(record.event) || record.sessionList === undefined ? undefined : {
        upstreamElapsedMs: safeElapsed(record.sessionList.upstreamElapsedMs),
        jsonElapsedMs: safeElapsed(record.sessionList.jsonElapsedMs),
        filterElapsedMs: safeElapsed(record.sessionList.filterElapsedMs),
        itemsCount: safeCount(record.sessionList.itemsCount),
        deadlineAbortElapsedMs: safeElapsed(record.sessionList.deadlineAbortElapsedMs),
        totalElapsedMs: safeElapsed(record.sessionList.totalElapsedMs),
        status: safeHttpStatus(record.sessionList.status),
      },
    }
    this.pending++
    this.queue = this.queue.then(async () => {
      const file = join(this.directory!, 'events.jsonl')
      await mkdir(this.directory!, { recursive: true })
      const size = await stat(file).then(s => s.size, e => { if (e.code === 'ENOENT') return 0; throw e })
      if (size >= this.limit) {
        await rm(`${file}.3`, { force: true })
        for (let index = 2; index >= 0; index--) {
          await rename(index ? `${file}.${index}` : file, `${file}.${index + 1}`)
            .catch(e => { if (e.code !== 'ENOENT') throw e })
        }
      }
      await appendFile(file, `${JSON.stringify(safe)}\n`, { mode: 0o600 })
    }).catch(() => { this.healthy = false; this.dropped++ }).finally(() => { this.pending-- })
  }
  flush(): Promise<void> { return this.queue }
}

function safeElapsed(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 86_400_000 ? Math.round(value) : undefined
}

function safeCount(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 100_000 ? value : undefined
}

function safeHttpStatus(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599 ? value : undefined
}

/** Free local health only; never generate or retry images for monitoring. */
export function startProviderProbe(baseUrl: string, journal: DiagnosticJournal, request: typeof fetch = fetch): () => void {
  const controller = new AbortController()
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let last = ''
  let lastWritten = 0
  const probe = async () => {
    const started = Date.now()
    let record: DiagnosticRecord
    try {
      const response = await request(new URL('/healthz', baseUrl), { redirect: 'error', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(4000)]) })
      const value = await response.json() as { status?: unknown; service?: unknown; pid?: unknown }
      const healthy = response.ok && value.status === 'ok' && value.service === 'opencodex'
      record = { event: 'provider.probe', healthy, elapsedMs: Date.now() - started,
        ...(typeof value.pid === 'number' && Number.isSafeInteger(value.pid) ? { providerPid: value.pid } : {}),
        ...(!response.ok ? { error: diagnosticError({ status: response.status }) } : {}),
      }
    } catch (error) {
      record = { event: 'provider.probe', healthy: false, elapsedMs: Date.now() - started, error: diagnosticError(error) }
    }
    if (stopped) return
    const key = JSON.stringify([record.healthy, record.providerPid, record.error])
    if (key !== last || Date.now() - lastWritten >= 60_000) {
      journal.record(record)
      last = key
      lastWritten = Date.now()
    }
    timer = setTimeout(() => { void probe() }, 15_000)
    timer.unref?.()
  }
  void probe()
  return () => { stopped = true; controller.abort(); if (timer) clearTimeout(timer) }
}
