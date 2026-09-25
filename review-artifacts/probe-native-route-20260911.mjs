import assert from 'node:assert/strict'
import { Agent } from 'node:https'
import { readFile, writeFile } from 'node:fs/promises'
import WebSocket from 'ws'
const publicBase = 'https://talk.opcvip.net', prefix = '/plugins/deepseek-harness-chatroom/api'
const credentials = JSON.parse(await readFile('C:/Users/datoo/.dsh/service/chatroom-secrets.json', 'utf8'))
const login = await fetch(publicBase + prefix + '/auth/login', { method: 'POST', headers: { Origin: publicBase, 'Content-Type': 'application/json' }, body: JSON.stringify({ username: credentials.testUsername, password: credentials.testPassword }), signal: AbortSignal.timeout(15000) })
assert.equal(login.status, 200)
const cookie = login.headers.getSetCookie().map(v => v.split(';')[0]).join('; ')
await login.arrayBuffer()
const duration = Number(process.argv[2] ?? 155000)
const evidence = { at: new Date().toISOString(), duration, results: [] }
const agent = new Agent({ proxyEnv: process.env })
try {
  await Promise.all([
    { base: 'http://127.0.0.1:3181', route: 'local' },
    { base: 'http://127.0.0.1:3185', route: 'bridge' },
    { base: publicBase, route: 'public-default' },
    { base: publicBase, route: 'public-explicit-environment-agent', agent },
  ].map(options => new Promise(resolve => {
    const at = Date.now(), row = { base: options.base, route: options.route, pings: 0, closedByProbe: false }
    const socket = new WebSocket(options.base.replace(/^http/, 'ws') + '/api/remote.mux', {
      agent: options.agent, headers: { Cookie: cookie, Origin: publicBase, Host: 'talk.opcvip.net' }, handshakeTimeout: 15000,
    })
    const timer = setTimeout(() => { row.closedByProbe = true; socket.close(); setTimeout(() => socket.terminate(), 2000).unref() }, duration)
    socket.on('open', () => { row.openMs = Date.now() - at; console.log(JSON.stringify({ stage: 'open', ...row })) })
    socket.on('ping', () => row.pings++)
    socket.on('error', error => { row.error = error.code ?? error.name })
    socket.on('unexpected-response', (_request, response) => { row.httpStatus = response.statusCode; response.resume(); socket.terminate() })
    socket.on('close', code => { clearTimeout(timer); row.code = code; row.elapsedMs = Date.now() - at; evidence.results.push(row); console.log(JSON.stringify(row)); resolve() })
  })))
} finally {
  agent.destroy()
  await writeFile(new URL(`./NATIVE-ROUTE-${Date.now()}.json`, import.meta.url), JSON.stringify(evidence, null, 2))
  await fetch(publicBase + prefix + '/auth/logout', { method: 'POST', headers: { Cookie: cookie, Origin: publicBase, 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(10000) }).then(r => r.arrayBuffer()).catch(() => {})
}
