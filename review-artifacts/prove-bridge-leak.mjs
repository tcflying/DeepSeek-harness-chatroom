import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import http from 'node:http'
import { once } from 'node:events'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const require = createRequire(import.meta.url)
const { createBridge } = require('../scripts/chatroom-origin-bridge.cjs')
const original = await readFile('C:/Users/datoo/.dsh/service/chatroom-origin-proxy.js', 'utf8')
const results = []
for (const version of ['old-production-source', 'fixed']) {
  const active = new Set()
  const target = http.createServer((_req, res) => { active.add(res); res.once('close', () => active.delete(res)); res.writeHead(200, { 'Content-Type': 'text/event-stream' }); res.write('data: test\n\n') })
  target.listen(0, '127.0.0.1'); await once(target, 'listening')
  const targetPort = target.address().port
  let server
  if (version === 'fixed') { server = createBridge({ targetPort }).server; server.listen(0, '127.0.0.1') }
  else vm.runInNewContext(original.replace('const LISTEN_PORT = 3185', 'const LISTEN_PORT = 0').replace('const TARGET_PORT = 3181', `const TARGET_PORT = ${targetPort}`), {
    require: name => name === 'http' ? { ...http, createServer: (...args) => (server = http.createServer(...args)) } : require(name),
    Buffer, console: { log() {} },
  })
  await once(server, 'listening')
  for (let n = 0; n < 20; n++) await new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${server.address().port}/events`, res => res.once('data', () => { res.destroy(); req.destroy(); resolve() }))
    req.on('error', reject)
  })
  await new Promise(resolve => setTimeout(resolve, 300))
  results.push({ version, clientDisconnects: 20, remainingUpstreamStreams: active.size })
  for (const response of active) response.destroy()
  server.closeAllConnections(); target.closeAllConnections()
  await Promise.all([new Promise(resolve => server.close(resolve)), new Promise(resolve => target.close(resolve))])
}
const evidence = { at: new Date().toISOString(), originalSha256: createHash('sha256').update(original).digest('hex'), results }
await writeFile(new URL('./BRIDGE-LEAK-20260911.json', import.meta.url), JSON.stringify(evidence, null, 2))
console.log(JSON.stringify(evidence))
if (results[0].remainingUpstreamStreams !== 20 || results[1].remainingUpstreamStreams !== 0) process.exitCode = 1
