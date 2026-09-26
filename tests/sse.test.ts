import { createServer } from 'node:http'
import { once, EventEmitter } from 'node:events'
import { afterEach, expect, it, vi } from 'vitest'
import { startSseResponse } from '../src/sse.js'
import { DiagnosticJournal } from '../src/diagnostics.js'

afterEach(() => vi.useRealTimers())

it('flushes quiet notification headers immediately and unsubscribes on response close', async () => {
  const journal = new DiagnosticJournal(':memory:'), record = vi.spyOn(journal, 'record')
  const unsubscribe = vi.fn(), controller = new AbortController()
  const server = createServer((request, response) => {
    startSseResponse({ request, response, stream: 'notifications', intervalMs: 15_000, journal, subscribe: () => unsubscribe })
  })
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  const port = (server.address() as { port: number }).port
  try {
    const response = await fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(1500)]) })
    expect(response.status).toBe(200)
    expect(response.headers.get('x-chatroom-stream-id')).toMatch(/^[\w-]{36}$/)
    const reader = response.body!.getReader()
    expect(new TextDecoder().decode((await reader.read()).value)).toContain('event: heartbeat')
    controller.abort()
    await vi.waitFor(() => expect(unsubscribe).toHaveBeenCalledTimes(1))
    expect(record).toHaveBeenLastCalledWith(expect.objectContaining({ event: 'sse.close', stream: 'notifications', heartbeatCount: 1 }))
  } finally { controller.abort(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
})

it('ignores completed GET close and cleans heartbeat and revalidation exactly once', async () => {
  vi.useFakeTimers()
  const request = new EventEmitter(), response = Object.assign(new EventEmitter(), { writeHead: vi.fn(), write: vi.fn(), end: vi.fn(), destroyed: false, writableEnded: false })
  const unsubscribe = vi.fn(), check = vi.fn(async () => false)
  const close = startSseResponse({ request: request as never, response: response as never,
    stream: 'room', intervalMs: 15000, journal: new DiagnosticJournal(':memory:'), subscribe: () => unsubscribe,
    revalidate: { intervalMs: 1000, check } })
  request.emit('close')
  expect(unsubscribe).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1000)
  close('plugin-stop'); response.emit('close')
  expect(unsubscribe).toHaveBeenCalledTimes(1)
  expect(response.end).toHaveBeenCalledTimes(1)
  expect(vi.getTimerCount()).toBe(0)
})
