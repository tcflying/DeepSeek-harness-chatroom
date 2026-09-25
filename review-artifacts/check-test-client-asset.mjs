import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const base = 'http://127.0.0.1:3186'
const stdout = await readFile(process.argv[2] || new URL('./image-hot-reload.stdout.log', import.meta.url), 'utf8')
const address = stdout.match(/http:\/\/127\.0\.0\.1:3186\/\?token=[^\s]+/u)?.[0]
assert.ok(address, 'Expected test instance login URL missing; never print its token')
const login = await fetch(address, { redirect: 'manual', signal: AbortSignal.timeout(15000) })
const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
assert.ok(cookie, 'Native test authentication cookie missing')
const page = await fetch(base + '/', { headers: { Cookie: cookie }, signal: AbortSignal.timeout(15000) })
assert.equal(page.status, 200)
const html = await page.text()
const sources = [...html.matchAll(/<script[^>]+src="([^"]+)"/gu)].map(match => match[1].replaceAll('&amp;', '&'))
const bootUrls = [...html.matchAll(/"([^"\n]*\/plugins\/[^"\n]*)"/gu)].flatMap(match => {
  try { return [JSON.parse('"' + match[1] + '"').replaceAll('&amp;', '&')] } catch { return [] }
})
const source = [...sources, ...bootUrls].find(value => value.startsWith('/plugins/') && value.includes('deepseek-harness-chatroom'))
assert.ok(source, 'Chatroom browser bundle absent from native boot page')
assert.ok(source.startsWith('/plugins/'))
const asset = await fetch(base + source, { headers: { Cookie: cookie }, signal: AbortSignal.timeout(15000) })
assert.equal(asset.status, 200)
const bytes = Buffer.from(await asset.arrayBuffer())
assert.ok(bytes.toString().includes('generated-'), 'Image preview build marker missing')
assert.ok(bytes.toString().includes('width: min(360px, 100%);'), 'Narrow file-card correction absent from served client')
console.log(JSON.stringify({ nativePage: page.status, asset: asset.status, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), imagePreviewMarker: true, narrowCardMarker: true }))
