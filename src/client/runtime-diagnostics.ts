import { CHATROOM_API_PREFIX } from '../routes.js'
import { rangeErrorEvidence } from '../runtime-failure-evidence.js'

export type ClientRuntimeFailureSource = 'window-error' | 'unhandled-rejection' | 'room-selection'
export type ClientRuntimeErrorKind = 'AbortError' | 'TimeoutError' | 'TypeError' | 'SyntaxError' | 'RangeError' | 'Error'
export type ClientRuntimeFailureReporter = (source: ClientRuntimeFailureSource, error: unknown) => void
export type ClientRuntimeFailureReporterHandle = ClientRuntimeFailureReporter & {
  abort(): void
  dispose(): void
}

export type ClientRuntimeFailureReporterOptions = {
  request?: typeof fetch
  now?: () => number
  document?: Pick<Document, 'visibilityState'>
  /** Production passes the current authenticated-ready gate; no identity is read or transmitted here. */
  canReport?: () => boolean
}

const runtimeErrorKinds = new Set<ClientRuntimeErrorKind>(['AbortError', 'TimeoutError', 'TypeError', 'SyntaxError', 'RangeError', 'Error'])
const REPORT_WINDOW_MS = 60_000
const MAX_REPORTS_PER_WINDOW = 5

/** Classify browser failures without retaining their message, stack, URL, or rejection value. */
export function clientRuntimeErrorKind(error: unknown): ClientRuntimeErrorKind {
  try {
    if (typeof error === 'object' && error !== null && 'name' in error) {
      const name = (error as { name?: unknown }).name
      if (typeof name === 'string' && runtimeErrorKinds.has(name as ClientRuntimeErrorKind)) return name as ClientRuntimeErrorKind
    }
  } catch { /* a hostile rejection value is still reported generically */ }
  return 'Error'
}

/**
 * Event-driven, bounded browser failure reporter. It never changes browser error
 * handling, retries writes, or preserves raw exception content.
 */
export function createClientRuntimeFailureReporter(options: ClientRuntimeFailureReporterOptions = {}): ClientRuntimeFailureReporterHandle {
  const request = options.request ?? fetch
  const now = options.now ?? Date.now
  const document = options.document ?? globalThis.document
  const recentByKind = new Map<ClientRuntimeErrorKind, number>()
  const sent: number[] = []
  const pending = new Set<AbortController>()
  let disposed = false
  const abort = () => { for (const controller of pending) controller.abort(); pending.clear() }
  const report = ((source: ClientRuntimeFailureSource, error: unknown) => {
    if (disposed || document?.visibilityState === 'hidden' || options.canReport?.() === false) { abort(); return }
    const kind = clientRuntimeErrorKind(error)
    const rangeError = kind === 'RangeError' ? rangeErrorEvidence(error) : undefined
    const at = now()
    const prior = recentByKind.get(kind)
    if (prior !== undefined && at - prior < REPORT_WINDOW_MS) return
    while (sent.length > 0 && at - sent[0]! >= REPORT_WINDOW_MS) sent.shift()
    if (sent.length >= MAX_REPORTS_PER_WINDOW) return
    recentByKind.set(kind, at)
    sent.push(at)
    const controller = new AbortController()
    pending.add(controller)
    void request(`${CHATROOM_API_PREFIX}/connection/diagnostic`, {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      // Never send error text or URL data. RangeError receives only a fixed
      // stack-overflow signature and allowlisted function/line coordinates.
      body: JSON.stringify({ runtimeSource: source, runtimeErrorKind: kind,
        ...(rangeError === undefined ? {} : { runtimeRangeError: rangeError }) }),
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(4_000)]),
    }).then(response => {
      // Response-body cleanup is best-effort. Its cancellation promise is not
      // a report lifetime and must not retain an already completed controller.
      try { void response.body?.cancel().catch(() => {}) } catch {}
    }).catch(() => {}).finally(() => { pending.delete(controller) })
  }) as ClientRuntimeFailureReporterHandle
  report.abort = abort
  report.dispose = () => { disposed = true; abort(); recentByKind.clear(); sent.splice(0) }
  return report
}

/** Attach global browser error listeners. No listener calls preventDefault. */
export function installClientRuntimeDiagnostics(report: ClientRuntimeFailureReporterHandle): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => report.dispose()
  const onError = (event: ErrorEvent) => { report('window-error', event.error) }
  const onUnhandledRejection = (event: PromiseRejectionEvent) => { report('unhandled-rejection', event.reason) }
  const onVisibility = () => { if (document.visibilityState === 'hidden') report.abort() }
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onUnhandledRejection)
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onUnhandledRejection)
    document.removeEventListener('visibilitychange', onVisibility)
    report.dispose()
  }
}
