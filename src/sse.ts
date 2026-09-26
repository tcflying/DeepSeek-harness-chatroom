import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { DiagnosticJournal } from './diagnostics.js'

type CloseReason = 'peer-end' | 'socket-error' | 'plugin-stop' | 'auth-failed'

/** Own the response lifetime, not IncomingMessage's already-complete GET lifetime. */
export function startSseResponse(options: {
  request: IncomingMessage
  response: ServerResponse
  stream: 'room' | 'notifications'
  intervalMs: number
  journal: DiagnosticJournal
  subscribe(): () => void
  revalidate?: { intervalMs: number; check(): Promise<boolean> }
  onClose?(): void
}): (reason?: CloseReason) => void {
  const { request, response, stream, journal } = options
  const operationId = randomUUID(), started = Date.now()
  let closed = false, beats = 0, checking = false
  let heartbeat: ReturnType<typeof setInterval> | undefined
  let revalidate: ReturnType<typeof setInterval> | undefined
  let unsubscribe = () => {}
  const close = (reason: CloseReason = 'peer-end') => {
    if (closed) return
    closed = true
    clearInterval(heartbeat); clearInterval(revalidate)
    request.off('aborted', aborted)
    response.off('close', ended); response.off('error', failed)
    unsubscribe()
    if (!response.destroyed && !response.writableEnded) response.end()
    journal.record({ event: 'sse.close', stream, operationId, reason, elapsedMs: Date.now() - started, heartbeatCount: beats })
    options.onClose?.()
  }
  const aborted = () => close('peer-end')
  const ended = () => close('peer-end')
  const failed = () => close('socket-error')
  if (request.aborted || response.destroyed || response.writableEnded) return close
  request.once('aborted', aborted)
  response.once('close', ended); response.once('error', failed)
  response.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', 'X-Chatroom-Stream-Id': operationId,
  })
  const beat = () => {
    if (closed || response.destroyed || response.writableEnded) return
    beats++
    response.write(`event: heartbeat\ndata: ${JSON.stringify({ streamId: operationId, intervalMs: options.intervalMs })}\n\n`)
  }
  // writeHead alone is buffered; a quiet notification stream otherwise waits 15 seconds.
  beat()
  journal.record({ event: 'sse.open', stream, operationId })
  try { unsubscribe = options.subscribe() }
  catch (error) { close('socket-error'); throw error }
  heartbeat = setInterval(beat, options.intervalMs)
  heartbeat.unref?.()
  if (options.revalidate) revalidate = setInterval(() => {
    if (checking || closed) return
    checking = true
    void options.revalidate!.check().then(valid => { if (!valid) close('auth-failed') })
      .catch(() => close('auth-failed')).finally(() => { checking = false })
  }, options.revalidate.intervalMs)
  revalidate?.unref?.()
  return close
}
