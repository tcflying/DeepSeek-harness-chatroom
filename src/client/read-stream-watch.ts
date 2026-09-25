/** Detect stalled headers, retrying CONNECTING streams and silent half-open links. */
export function watchReadStream(source: EventSource, stale: () => void): { touch(): void; stop(): void } {
  let stopped = false
  let silenceMs = 60_000
  let timer: ReturnType<typeof setTimeout>
  const arm = (ms: number) => {
    clearTimeout(timer)
    if (!stopped) timer = setTimeout(() => { if (!stopped) stale() }, ms)
    timer?.unref?.()
  }
  const touch = () => arm(silenceMs)
  const heartbeat = (event: MessageEvent<string>) => {
    try {
      const value = JSON.parse(event.data) as { intervalMs?: unknown }
      if (typeof value.intervalMs === 'number' && Number.isFinite(value.intervalMs)) silenceMs = Math.max(45_000, Math.min(300_000, value.intervalMs * 3))
    } catch { /* Malformed heartbeats cannot expand the bounded deadline. */ }
    touch()
  }
  source.addEventListener?.('heartbeat', heartbeat)
  arm(25_000)
  return { touch, stop() { stopped = true; clearTimeout(timer); source.removeEventListener?.('heartbeat', heartbeat) } }
}
