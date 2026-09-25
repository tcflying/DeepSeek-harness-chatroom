import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'
const root = new URL('../', import.meta.url)
const json = async path => JSON.parse((await readFile(path, 'utf8')).replace(/^\uFEFF/, ''))
const version = (await json(new URL('package.json', root))).version
assert.equal(version, '1.5.0-codex.rc1.20')
const bundles = []
for (const name of ['dist/index.js', 'dist/client.js']) {
  const digest = data => createHash('sha256').update(data).digest('hex')
  const local = digest(await readFile(new URL(name, root)))
  const installed = digest(await readFile(`C:/Users/datoo/.dsh/chatroom-server/profiles/web/plugin-releases/chatroom-${version}/${name}`))
  assert.equal(local, installed)
  bundles.push({ name, sha256: local })
}
const patch = await readFile('C:/Users/datoo/.dsh/chatroom-server/profiles/web/cordis.patch.yml', 'utf8')
assert.ok(patch.includes(`chatroom-${version}/dist/index.js`))
const bridge = await json(new URL('./BRIDGE-LEAK-20260911.json', import.meta.url))
assert.deepEqual(bridge.results.map(x => x.remainingUpstreamStreams), [20, 0])
const servy = await json(new URL('./ORIGIN-SERVY-20260911.json', import.meta.url))
assert.equal(servy.cutover, true)
assert.match(servy.status, /Running/)
const probe = await json(new URL('./TRANSPORT-PROBE-1789118121091.json', import.meta.url))
assert.equal(probe.sockets.length, 4)
assert.ok(probe.sockets.every(s => s.closedByProbe && s.elapsedMs >= 45000 && s.openMs !== undefined))
assert.ok(probe.files.filter(f => f.unauthenticatedThumbnail !== undefined).every(f => f.unauthenticatedThumbnail === 401))
const original = probe.files.find(f => f.origin.startsWith('https:') && f.preview === false)
const preview = probe.files.find(f => f.origin.startsWith('https:') && f.preview === true)
assert.equal(original.status, 200); assert.equal(preview.status, 200)
assert.equal(preview.type, 'image/webp'); assert.ok(preview.bytes < original.bytes / 10)
const ui = await json(new URL('./IAB-media-ui-20260911.json', import.meta.url))
assert.deepEqual(ui.viewport, [390, 844]); assert.ok(ui.picker); assert.equal(ui.add.height, 46)
const record = { at: new Date().toISOString(), version, bundles, publicImage: { originalBytes: original.bytes, previewBytes: preview.bytes, savedPercent: +(100 * (1 - preview.bytes / original.bytes)).toFixed(2) }, probe: probe.at, bridgeRegression: bridge.at, originalBrowserAt: ui.at, evidenceScope: 'Current source/deployment hashes and retained actual-browser/provider-transport receipts; not a new paid generation or a boot/restart endurance test.' }
await writeFile(new URL('./MEDIA-DELIVERY-MANIFEST-20260911.json', import.meta.url), JSON.stringify(record, null, 2))
console.log(JSON.stringify(record))
