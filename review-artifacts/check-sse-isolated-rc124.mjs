import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const base = 'http://127.0.0.1:3186', prefix = '/plugins/deepseek-harness-chatroom/api'
const r = await fetch(base + prefix + '/session', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ displayName: '同步连接验收', avatarId: 'whale' }) })
assert.equal(r.status, 201)
const cookie = r.headers.getSetCookie().map(v => v.split(';')[0]).join('; ')
const session = await r.json()
const results = []
for (const path of ['/notifications', `/events?roomId=${session.room.id}`]) {
  const controller = new AbortController(), at = Date.now()
  const res = await fetch(base + prefix + path, { headers: { Cookie: cookie }, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(3000)]) })
  assert.equal(res.status, 200)
  assert.match(res.headers.get('x-chatroom-stream-id'), /^[\w-]{36}$/)
  const first = await res.body.getReader().read()
  assert.ok(new TextDecoder().decode(first.value).includes('event: heartbeat'))
  results.push({ path: path.split('?')[0], headersMs: Date.now() - at, streamId: res.headers.get('x-chatroom-stream-id') })
  controller.abort()
}
const stdout = await readFile(new URL('./RC124-isolated.stdout.log', import.meta.url), 'utf8')
const loginUrl = stdout.match(/http:\/\/127\.0\.0\.1:3186\/\?token=[^\s]+/u)?.[0]
assert.ok(loginUrl, 'Native test login URL missing')
const nativeLogin = await fetch(loginUrl, { redirect: 'manual' })
const nativeCookie = nativeLogin.headers.getSetCookie().map(v => v.split(';')[0]).join('; ')
await nativeLogin.arrayBuffer()
const html = await fetch(base, { headers: { Cookie: nativeCookie } }).then(r => r.text())
const url = html.match(/"id":"deepseek-harness-chatroom","url":"([^"]+)"/u)?.[1]
assert.ok(url)
const client = await fetch(base + url, { headers: { Cookie: nativeCookie } }).then(r => r.text())
const markers = ['dsh-chatroom-management-dialog', '/connection/diagnostic', 'heartbeat'].map(marker => ({ marker, found: client.includes(marker) }))
console.log(JSON.stringify({ at: new Date().toISOString(), version: '1.5.0-codex.rc1.24', results, markers, clientBytes: Buffer.byteLength(client), clientSha256: createHash('sha256').update(client).digest('hex') }))
assert.ok(markers.every(marker => marker.found), 'Current scoped client markers missing')
