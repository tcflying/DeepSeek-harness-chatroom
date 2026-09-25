import { createRequire } from 'node:module'
import { once } from 'node:events'
import { readFile, writeFile } from 'node:fs/promises'
import WebSocket from 'ws'
const { createBridge } = createRequire(import.meta.url)('../scripts/chatroom-origin-bridge.cjs')
const bridge = createBridge()
bridge.server.listen(0, '127.0.0.1'); await once(bridge.server, 'listening')
const base = `http://127.0.0.1:${bridge.server.address().port}`
const secrets = JSON.parse(await readFile('C:/Users/datoo/.dsh/service/chatroom-secrets.json', 'utf8'))
const prefix = '/plugins/deepseek-harness-chatroom/api'
const result = { at: new Date().toISOString() }
try {
  const login = await fetch(base + prefix + '/auth/login', { method: 'POST', headers: { Host: 'talk.opcvip.net', Origin: 'https://talk.opcvip.net', 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-origin' }, body: JSON.stringify({ username: secrets.testUsername, password: secrets.testPassword }), signal: AbortSignal.timeout(15000) })
  result.login = login.status; await login.arrayBuffer()
  if (!login.ok) throw new Error(`same-origin login failed ${login.status}`)
  const cookie = login.headers.getSetCookie().map(x => x.split(';')[0]).join('; ')
  result.native = await new Promise(resolve => {
    const ws = new WebSocket(base.replace('http:', 'ws:') + '/api/remote.mux', { headers: { Host: 'talk.opcvip.net', Origin: 'https://talk.opcvip.net', Cookie: cookie }, handshakeTimeout: 12000 })
    ws.on('open', () => { resolve('open'); ws.close() }); ws.on('error', e => resolve(e.code ?? e.message))
    ws.on('unexpected-response', (_req, res) => { resolve(res.statusCode); res.resume(); ws.terminate() })
  })
  for (const origin of ['https://talk.opcvip.net', 'https://evil.test']) {
    const response = await fetch(base + prefix + '/auth/login', { method: 'POST', headers: { Host: 'talk.opcvip.net', Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ username: secrets.testUsername, password: secrets.testPassword }), signal: AbortSignal.timeout(10000) })
    result[origin] = response.status; await response.arrayBuffer()
  }
  await writeFile(new URL('./ORIGIN-COMPATIBILITY-20260911.json', import.meta.url), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result))
  if (result.native !== 'open' || result['https://talk.opcvip.net'] !== 200 || result['https://evil.test'] < 400) process.exitCode = 1
} finally { await bridge.close() }
