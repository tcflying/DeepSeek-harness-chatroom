import { readFile, writeFile } from 'node:fs/promises'
import WebSocket from 'ws'
const prefix = '/plugins/deepseek-harness-chatroom/api'
const secrets = JSON.parse(await readFile('C:/Users/datoo/.dsh/service/chatroom-secrets.json', 'utf8'))
const base = 'http://127.0.0.1:3181'
const login = await fetch(base + prefix + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ username: secrets.testUsername, password: secrets.testPassword }), signal: AbortSignal.timeout(15000) })
if (!login.ok) throw new Error(`Login status ${login.status}`)
const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
const output = { at: new Date().toISOString(), sockets: [], files: [] }
const probe = (origin, pongDelay = 0) => new Promise(resolve => {
  const started = Date.now()
  const row = { origin, pongDelay, pings: [], closedByProbe: false }
  const socket = new WebSocket(origin.replace(/^http/, 'ws') + '/api/remote.mux', { headers: { Origin: origin, Cookie: cookie }, autoPong: false, handshakeTimeout: 12000 })
  const timers = new Set()
  const limit = setTimeout(() => { row.closedByProbe = true; socket.close(); setTimeout(() => socket.terminate(), 2000).unref() }, 45000)
  socket.on('open', () => { row.openMs = Date.now() - started })
  socket.on('ping', data => {
    row.pings.push(Date.now() - started)
    const timer = setTimeout(() => { timers.delete(timer); if (socket.readyState === WebSocket.OPEN) socket.pong(data) }, pongDelay)
    timers.add(timer)
  })
  socket.on('error', error => { row.errorCode = error.code ?? error.name })
  socket.on('unexpected-response', (_req, response) => { row.httpStatus = response.statusCode; response.resume(); socket.terminate() })
  socket.on('close', code => { clearTimeout(limit); for (const timer of timers) clearTimeout(timer); Object.assign(row, { code, elapsedMs: Date.now() - started }); output.sockets.push(row); console.log(JSON.stringify(row)); resolve() })
})
await Promise.all([
  probe(base), probe('https://talk.opcvip.net'), probe(base, 7500), probe('https://talk.opcvip.net', 7500),
  ...[base, 'https://talk.opcvip.net'].map(async origin => {
    const started = Date.now()
    try {
      const id = '200c5997-832d-407f-9ce0-c4356c3b5852'
      for (const suffix of ['', '?preview=thumbnail']) {
        const response = await fetch(origin + prefix + '/files/' + id + suffix, { headers: { Cookie: cookie }, signal: AbortSignal.timeout(20000) })
        const bytes = Buffer.from(await response.arrayBuffer())
        output.files.push({ origin, preview: suffix !== '', status: response.status, type: response.headers.get('content-type'), bytes: bytes.length, elapsedMs: Date.now() - started })
      }
      const unauth = await fetch(origin + prefix + '/files/' + id + '?preview=thumbnail', { signal: AbortSignal.timeout(15000) })
      await unauth.arrayBuffer()
      output.files.push({ origin, unauthenticatedThumbnail: unauth.status })
    } catch (error) { output.files.push({ origin, error: error.cause?.code ?? error.name, elapsedMs: Date.now() - started }) }
  }),
])
const path = new URL(`./TRANSPORT-PROBE-${Date.now()}.json`, import.meta.url)
await writeFile(path, JSON.stringify(output, null, 2))
console.log(JSON.stringify({ files: output.files, evidence: path.pathname }))
