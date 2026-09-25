import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const base = 'http://127.0.0.1:3186'
const stdout = await readFile(new URL('RC145-rootdiag.stdout.log', import.meta.url), 'utf8')
const login = stdout.match(/http:\/\/127\.0\.0\.1:3186\/\?token=[^\s]+/u)?.[0]
assert.ok(login, 'owned test Host login unavailable')
const res = await fetch(login, { redirect: 'manual', signal: AbortSignal.timeout(8000) })
assert.ok([200, 303].includes(res.status), `native login status ${res.status}`)
const cookie = res.headers.getSetCookie().map(item => item.split(';')[0]).join('; ')
await res.body?.cancel()
assert.ok(cookie, 'native test session absent')
const page = await fetch(base, { headers: { Cookie: cookie }, signal: AbortSignal.timeout(10000) })
assert.equal(page.status, 200)
const html = await page.text()
const path = html.match(/"id"\s*:\s*"deepseek-harness-chatroom"\s*,\s*"url"\s*:\s*"([^"]+)"/u)?.[1]
assert.ok(path, 'client manifest absent')
const client = await fetch(new URL(path, base), { headers: { Cookie: cookie }, signal: AbortSignal.timeout(10000) })
assert.equal(client.status, 200)
const served = Buffer.from(await client.arrayBuffer())
const candidate = await readFile(new URL('../dist/client.js', import.meta.url))
await writeFile(new URL('RC145-served-client.js', import.meta.url), served, { flag: 'wx' })
let prefix = 0, suffix = 0
while (prefix < Math.min(served.length, candidate.length) && served[prefix] === candidate[prefix]) prefix++
while (suffix < Math.min(served.length, candidate.length) - prefix && served[served.length - 1 - suffix] === candidate[candidate.length - 1 - suffix]) suffix++
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
console.log(JSON.stringify({ servedBytes: served.length, candidateBytes: candidate.length, prefix, suffix,
  servedSha256: sha(served), candidateSha256: sha(candidate),
  servedDifference: served.subarray(prefix, Math.min(prefix + 400, served.length - suffix)).toString(),
  candidateDifference: candidate.subarray(prefix, Math.min(prefix + 400, candidate.length - suffix)).toString(),
}, null, 2))
