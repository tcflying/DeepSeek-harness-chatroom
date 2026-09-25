import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
const base = 'https://talk.opcvip.net'
const root = await fetch(base, { signal: AbortSignal.timeout(30000) })
assert.ok(root.ok)
const html = await root.text()
const assets = [...new Set([...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(match => match[1].replaceAll('&amp;', '&')))]
  .filter(path => path.startsWith('/assets/') || path.startsWith('/plugins/?'))
console.log(JSON.stringify({ rootStatus: root.status, assetCount: assets.length }))
for (const path of assets) {
  if (!path.startsWith('/plugins/?') && !path.endsWith('.js') && !path.endsWith('.css')) continue
  for (let attempt = 1; attempt <= 2; attempt++) {
    const start = performance.now()
    const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(60000) })
    const ttfbMs = Math.round(performance.now() - start)
    const body = Buffer.from(await response.arrayBuffer())
    console.log(JSON.stringify({ kind: path.startsWith('/plugins/?') ? 'combined-plugin' : path,
      urlSha256: createHash('sha256').update(path).digest('hex'), attempt, status: response.status,
      cache: response.headers.get('cf-cache-status'), age: response.headers.get('age'), cacheControl: response.headers.get('cache-control'),
      contentEncoding: response.headers.get('content-encoding'), decodedBytes: body.length, ttfbMs,
      bodySha256: createHash('sha256').update(body).digest('hex') }))
    assert.ok(response.ok)
  }
}
const health = await fetch(base + '/plugins/deepseek-harness-chatroom/api/health', { signal: AbortSignal.timeout(30000) })
console.log(JSON.stringify({ health: await health.json(), status: health.status, cache: health.headers.get('cf-cache-status'), cacheControl: health.headers.get('cache-control') }))
