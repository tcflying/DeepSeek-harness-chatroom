/** Loopback-only origin bridge. Own and release both halves of every stream. */
const http = require('node:http')
const net = require('node:net')
const { randomUUID } = require('node:crypto')

function createBridge({ targetPort = 3181, publicHost = 'talk.opcvip.net', log = () => {} } = {}) {
  const active = new Set()
  const peers = new Set()
  const stats = { requests: 0, disconnected: 0, upstreamErrors: 0, websocketOpened: 0, websocketClosed: 0 }
  const record = (event, fields = {}) => log({ at: new Date().toISOString(), pid: process.pid, event, ...fields })
  const headers = input => ({ ...input, host: publicHost, 'x-forwarded-host': publicHost, 'x-forwarded-proto': 'https' })
  const server = http.createServer((req, res) => {
    const port = server.address()?.port
    if (req.url === '/__bridge_health' && req.headers.host === `127.0.0.1:${port}`) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify({ ready: true, pid: process.pid, upstreamActive: active.size, ...stats })); return
    }
    stats.requests++
    const started = Date.now()
    const id = randomUUID()
    let upstreamRes
    const upstream = http.request({ host: '127.0.0.1', port: targetPort, method: req.method, path: req.url, headers: headers(req.headers) }, incoming => {
      upstreamRes = incoming
      clearTimeout(deadline)
      res.writeHead(incoming.statusCode, incoming.headers)
      incoming.on('error', fail)
      incoming.pipe(res)
    })
    active.add(upstream)
    let deadline
    upstream.once('finish', () => {
      if (upstreamRes || upstream.destroyed) return
      deadline = setTimeout(() => upstream.destroy(Object.assign(new Error('upstream header timeout'), { code: 'ETIMEDOUT' })), 30000)
      deadline.unref()
    })
    const dispose = () => { clearTimeout(deadline); active.delete(upstream); upstreamRes?.destroy(); upstream.destroy() }
    const fail = error => {
      if (res.destroyed) return
      stats.upstreamErrors++
      record('bridge.http.failure', { id, elapsedMs: Date.now() - started, code: /^E[A-Z0-9_]+$/.test(error.code ?? '') ? error.code : 'ERROR' })
      if (!res.headersSent) { res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('聊天服务暂时不可用，请重连。') }
      else res.destroy()
      dispose()
    }
    upstream.on('error', fail)
    req.once('aborted', dispose)
    res.once('close', () => {
      if (!res.writableFinished) stats.disconnected++
      dispose()
    })
    req.pipe(upstream)
  })
  server.on('connection', socket => { peers.add(socket); socket.once('close', () => peers.delete(socket)) })
  server.on('upgrade', (req, socket, head) => {
    const started = Date.now()
    const id = randomUUID()
    const upstream = net.connect(targetPort, '127.0.0.1')
    active.add(upstream)
    let closed = false
    const dispose = (reason = 'closed') => {
      if (closed) return
      closed = true
      clearTimeout(deadline)
      active.delete(upstream)
      socket.destroy(); upstream.destroy()
      stats.websocketClosed++
      record('bridge.ws.close', { id, reason, elapsedMs: Date.now() - started })
    }
    const deadline = setTimeout(() => dispose('handshake-timeout'), 15000)
    deadline.unref()
    upstream.once('data', () => clearTimeout(deadline))
    upstream.once('connect', () => {
      if (socket.destroyed) { dispose('client-gone'); return }
      const lines = [`${req.method} ${req.url} HTTP/1.1`]
      for (const [key, value] of Object.entries(headers(req.headers))) for (const item of Array.isArray(value) ? value : [value]) {
        if (item !== undefined) lines.push(`${key}: ${item}`)
      }
      upstream.write(Buffer.concat([Buffer.from(lines.join('\r\n') + '\r\n\r\n'), head]))
      socket.pipe(upstream); upstream.pipe(socket)
      stats.websocketOpened++
      record('bridge.ws.open', { id, elapsedMs: Date.now() - started })
    })
    upstream.once('error', () => { stats.upstreamErrors++; dispose('upstream-error') })
    socket.once('error', () => dispose('client-error'))
    upstream.once('close', () => dispose('upstream-close'))
    socket.once('close', () => dispose('client-close'))
  })
  return { server, active, stats, close: async () => {
    const closed = new Promise(resolve => server.close(resolve))
    for (const peer of peers) peer.destroy()
    for (const upstream of active) upstream.destroy()
    await closed
  } }
}

module.exports = { createBridge }
if (require.main === module) {
  const port = Number(process.env.CHATROOM_BRIDGE_PORT || 3185)
  const bridge = createBridge({ log: record => console.log(JSON.stringify(record)) })
  bridge.server.listen(port, '127.0.0.1', () => console.log(JSON.stringify({ event: 'bridge.start', at: new Date().toISOString(), pid: process.pid, port })))
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => { void bridge.close().then(() => process.exit(0)) })
}
