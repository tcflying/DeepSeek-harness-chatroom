// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import {
  clientRuntimeErrorKind,
  createClientRuntimeFailureReporter,
  installClientRuntimeDiagnostics,
} from '../src/client/runtime-diagnostics.js'

afterEach(() => { vi.useRealTimers() })

it('reports only an allowlisted error class and fixed source', async () => {
  const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }))
  const report = createClientRuntimeFailureReporter({ request })
  report('window-error', new RangeError('private prompt https://secret.example/path'))
  await vi.waitFor(() => expect(request).toHaveBeenCalledOnce())
  const [, init] = request.mock.calls[0]!
  expect(init?.body).toBe(JSON.stringify({ runtimeSource: 'window-error', runtimeErrorKind: 'RangeError', runtimeRangeError: { signature: 'other' } }))
  expect(JSON.stringify(init?.body)).not.toContain('private')
  expect(JSON.stringify(init?.body)).not.toContain('secret.example')
  report.dispose()
})

it('deduplicates by class, caps a minute, and aborts pending reports when hidden', async () => {
  vi.useFakeTimers()
  let at = 0
  let signal: AbortSignal | undefined
  const request = vi.fn<typeof fetch>().mockImplementation((_url, init) => {
    signal = init?.signal ?? undefined
    return new Promise<Response>(() => {})
  })
  const reporter = createClientRuntimeFailureReporter({ request, now: () => at, document: { visibilityState: 'visible' } })
  reporter('window-error', new RangeError())
  reporter('unhandled-rejection', new RangeError())
  for (const error of [new TypeError(), new SyntaxError(), new Error(), Object.assign(new Error(), { name: 'TimeoutError' }), Object.assign(new Error(), { name: 'AbortError' })]) {
    at += 1
    reporter('window-error', error)
  }
  expect(request).toHaveBeenCalledTimes(5)
  reporter.abort()
  expect(signal?.aborted).toBe(true)
  reporter.dispose()
})

it('does not post before the authenticated-ready owner gate allows diagnostics', () => {
  const request = vi.fn<typeof fetch>()
  const reporter = createClientRuntimeFailureReporter({ request, canReport: () => false })
  reporter('room-selection', new RangeError('private'))
  expect(request).not.toHaveBeenCalled()
  reporter.dispose()
})

it('listens without suppressing browser errors and removes listeners on cleanup', async () => {
  const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }))
  const report = createClientRuntimeFailureReporter({ request })
  const remove = vi.spyOn(window, 'removeEventListener')
  const cleanup = installClientRuntimeDiagnostics(report)
  const event = new ErrorEvent('error', { cancelable: true, error: new RangeError('private') })
  expect(window.dispatchEvent(event)).toBe(true)
  await vi.waitFor(() => expect(request).toHaveBeenCalledOnce())
  cleanup()
  expect(remove).toHaveBeenCalledWith('error', expect.any(Function))
  expect(remove).toHaveBeenCalledWith('unhandledrejection', expect.any(Function))
  remove.mockRestore()
})

it('classifies unknown values as generic errors', () => {
  expect(clientRuntimeErrorKind({ name: 'ReferenceError', message: 'secret' })).toBe('Error')
})

it('reports a hostile rejection value generically without reading it into the payload', async () => {
  const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }))
  const reporter = createClientRuntimeFailureReporter({ request })
  const hostile = new Proxy({}, {
    has: () => { throw new Error('private has trap') },
    get: () => { throw new Error('private get trap') },
  })
  expect(() => reporter('unhandled-rejection', hostile)).not.toThrow()
  await vi.waitFor(() => expect(request).toHaveBeenCalledOnce())
  expect(request.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ runtimeSource: 'unhandled-rejection', runtimeErrorKind: 'Error' }))
  reporter.dispose()
})

it('releases a completed report even if its response stream cancellation never settles', async () => {
  let signal: AbortSignal | undefined
  const cancel = vi.fn(() => new Promise<void>(() => {}))
  const stream = new ReadableStream({ cancel })
  const request = vi.fn<typeof fetch>().mockImplementation((_url, init) => {
    signal = init?.signal ?? undefined
    return Promise.resolve(new Response(stream))
  })
  const reporter = createClientRuntimeFailureReporter({ request })
  reporter('window-error', new Error())
  await vi.waitFor(() => expect(cancel).toHaveBeenCalledOnce())
  reporter.abort()
  expect(signal?.aborted).toBe(false)
  reporter.dispose()
})
