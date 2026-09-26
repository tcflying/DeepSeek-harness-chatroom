import { afterEach, expect, it, vi } from 'vitest'
import { watchReadStream } from '../src/client/read-stream-watch.js'
afterEach(() => vi.useRealTimers())
it('bounds stalled CONNECTING headers and cancels the deadline on hide/close', async () => {
  vi.useFakeTimers()
  const source = new EventTarget(), stale = vi.fn()
  const watch = watchReadStream(source as EventSource, stale)
  await vi.advanceTimersByTimeAsync(24999); expect(stale).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1); expect(stale).toHaveBeenCalledTimes(1)
  watch.stop(); watch.touch()
  await vi.advanceTimersByTimeAsync(100000); expect(stale).toHaveBeenCalledTimes(1)
})
it('uses real named heartbeats to keep quiet streams alive and detects lost heartbeat', async () => {
  vi.useFakeTimers()
  const source = new EventTarget(), stale = vi.fn()
  const watch = watchReadStream(source as EventSource, stale)
  for (let i = 0; i < 12; i++) {
    source.dispatchEvent(new MessageEvent('heartbeat', { data: JSON.stringify({ intervalMs: 15000 }) }))
    await vi.advanceTimersByTimeAsync(15000)
  }
  expect(stale).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(30000); expect(stale).toHaveBeenCalledTimes(1)
  watch.stop(); expect(vi.getTimerCount()).toBe(0)
})
