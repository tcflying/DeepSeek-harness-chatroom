import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { DiagnosticJournal, diagnosticError, diagnosticStream, startProviderProbe } from '../src/diagnostics.js'
const roots: string[] = []
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }) })
async function root() { const p = await mkdtemp(join(tmpdir(), 'chatroom-diagnostics-')); roots.push(p); return p }
it('keeps nested transport codes and HTTP status without raw secrets', () => {
  const error = new TypeError('secret URL token', { cause: Object.assign(new Error('credential'), { code: 'ECONNREFUSED', status: 503 }) })
  expect(diagnosticError(error)).toEqual({ kind: 'Error', code: 'ECONNREFUSED', httpStatus: 503 })
  expect(JSON.stringify(diagnosticError({ name: 'secret', code: 'secret', message: 'secret' }))).not.toContain('secret')
})
it('serializes a session catalogue timeout with only its bounded status evidence', async () => {
  const journal = new DiagnosticJournal(await root())
  journal.record({
    event: 'native.session-list.timeout', elapsedMs: 30_000, error: { kind: 'TimeoutError', httpStatus: 504 },
    sessionList: { upstreamElapsedMs: 8, jsonElapsedMs: 10, filterElapsedMs: 30_000, itemsCount: 3, deadlineAbortElapsedMs: 30_000, totalElapsedMs: 30_001, status: 504 },
  })
  await journal.flush()
  const record = JSON.parse(await readFile(join(journal.directory!, 'events.jsonl'), 'utf8'))
  expect(record).toMatchObject({
    event: 'native.session-list.timeout', elapsedMs: 30_000, error: { kind: 'TimeoutError', httpStatus: 504 },
    sessionList: { upstreamElapsedMs: 8, jsonElapsedMs: 10, filterElapsedMs: 30_000, itemsCount: 3, deadlineAbortElapsedMs: 30_000, totalElapsedMs: 30_001, status: 504 },
  })
  expect(Object.keys(record).sort()).toEqual(['at', 'elapsedMs', 'error', 'event', 'pid', 'sessionList', 'version'])
  expect(JSON.stringify(record)).not.toContain('sessionId')
})
it('never writes native catalogue stages on a different diagnostic event', async () => {
  const journal = new DiagnosticJournal(await root())
  journal.record({ event: 'runtime.start', sessionList: { itemsCount: 99, status: 504 } })
  await journal.flush()
  const record = JSON.parse(await readFile(join(journal.directory!, 'events.jsonl'), 'utf8'))
  expect(record).not.toHaveProperty('sessionList')
})
it('serializes a client runtime error class and fixed stack-overflow evidence without browser contents', async () => {
  const journal = new DiagnosticJournal(await root())
  journal.record({ event: 'client.runtime.failure', clientRuntime: { source: 'room-selection' },
    error: { kind: 'RangeError' } })
  await journal.flush()
  const record = JSON.parse(await readFile(join(journal.directory!, 'events.jsonl'), 'utf8'))
  expect(record).toMatchObject({ event: 'client.runtime.failure', clientRuntime: { source: 'room-selection' }, error: { kind: 'RangeError' } })
  expect(Object.keys(record).sort()).toEqual(['at', 'clientRuntime', 'error', 'event', 'pid', 'version'])
})
it('re-sanitizes RangeError evidence before it reaches the journal', async () => {
  const journal = new DiagnosticJournal(await root())
  journal.record({ event: 'client.runtime.failure', error: { kind: 'RangeError' }, clientRuntime: {
    source: 'unhandled-rejection', rangeError: { signature: 'stack-overflow', frames: ['syncSession:1:2', 'secretName:3:4'] },
  } })
  await journal.flush()
  const record = JSON.parse(await readFile(join(journal.directory!, 'events.jsonl'), 'utf8'))
  expect(record.clientRuntime.rangeError).toEqual({ signature: 'stack-overflow', frames: ['syncSession:1:2', 'anonymous:3:4'] })
  expect(JSON.stringify(record)).not.toContain('secretName')
})
it('serializes only de-identified room selection stages and peer closure', async () => {
  const journal = new DiagnosticJournal(await root())
  journal.record({ event: 'room.select.stage', roomSelection: { stage: 'response', outcome: 'failure', elapsedMs: 42, closed: true } })
  await journal.flush()
  const record = JSON.parse(await readFile(join(journal.directory!, 'events.jsonl'), 'utf8'))
  expect(record).toMatchObject({ event: 'room.select.stage', roomSelection: { stage: 'response', outcome: 'failure', elapsedMs: 42, closed: true } })
  expect(Object.keys(record).sort()).toEqual(['at', 'event', 'pid', 'roomSelection', 'version'])
})
it('rotates four bounded files and preserves operation correlation', async () => {
  const journal = new DiagnosticJournal(await root(), 256)
  for (let i = 0; i < 16; i++) { journal.record({ event: 'image.failure', operationId: `operation-${i}`, error: { kind: 'Error', code: 'ECONNREFUSED' } }); await journal.flush() }
  expect((await readdir(journal.directory!)).sort()).toEqual(['events.jsonl', 'events.jsonl.1', 'events.jsonl.2', 'events.jsonl.3'])
  const records = (await readFile(join(journal.directory!, 'events.jsonl'), 'utf8')).trim().split('\n').map(s => JSON.parse(s))
  expect(records.at(-1)).toMatchObject({ event: 'image.failure', operationId: 'operation-15', error: { code: 'ECONNREFUSED' } })
  expect(journal.status.healthy).toBe(true)
})
it('surfaces evidence disk failure without rejecting application work', async () => {
  const directory = await root()
  await writeFile(join(directory, 'diagnostics'), 'not a directory')
  const journal = new DiagnosticJournal(directory)
  journal.record({ event: 'runtime.start' })
  await journal.flush()
  expect(journal.status).toMatchObject({ healthy: false, dropped: 1 })
})
it('observes stream errors but never retries or replaces thrown error', async () => {
  const journal = new DiagnosticJournal(await root())
  const cause = Object.assign(new Error('private-body'), { code: 'TRANSPORT' })
  const chunks: number[] = []
  async function* stream() { yield 1; throw cause }
  await expect((async () => { for await (const chunk of diagnosticStream(stream(), journal, 'session-1')) chunks.push(chunk) })()).rejects.toBe(cause)
  await journal.flush()
  expect(chunks).toEqual([1])
  const log = await readFile(join(journal.directory!, 'events.jsonl'), 'utf8')
  expect(log).toContain('TRANSPORT')
  expect(log).not.toContain('private-body')
})

it('records health loss, process replacement and recovery without paid POST requests', async () => {
  vi.useFakeTimers()
  const journal = new DiagnosticJournal(await root())
  const request = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'ok', service: 'opencodex', pid: 11 })))
    .mockRejectedValueOnce(new TypeError('private', { cause: { code: 'ECONNREFUSED' } }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'ok', service: 'opencodex', pid: 22 })))
  const stop = startProviderProbe('http://127.0.0.1:10100/v1', journal, request)
  try {
    await vi.advanceTimersByTimeAsync(1)
    await vi.advanceTimersByTimeAsync(15000)
    await vi.advanceTimersByTimeAsync(15000)
    await journal.flush()
    const records = (await readFile(join(journal.directory!, 'events.jsonl'), 'utf8')).trim().split('\n').map(s => JSON.parse(s))
    expect(records.map(r => [r.healthy, r.providerPid])).toEqual([[true, 11], [false, undefined], [true, 22]])
    expect(records[1].error.code).toBe('ECONNREFUSED')
    expect(request.mock.calls.every(([url, options]) => String(url).endsWith('/healthz') && options?.method === undefined)).toBe(true)
  } finally { stop(); vi.useRealTimers() }
})
