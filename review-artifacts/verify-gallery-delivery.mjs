import assert from 'node:assert/strict'
import { readFile, writeFile, readdir, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const version = '1.5.0-codex.rc1.22'
const profile = 'C:/Users/datoo/.dsh/chatroom-server/profiles/web'
const release = `${profile}/plugin-releases/chatroom-${version}`
const json = async path => JSON.parse((await readFile(path, 'utf8')).replace(/^\uFEFF/, ''))
const artifact = name => new URL(`./${name}`, import.meta.url)
const overlay = await readFile(`${profile}/cordis.patch.yml`, 'utf8')
assert.ok(overlay.includes(`chatroom-${version}/dist/index.js`))
assert.ok(overlay.includes('miniMaxCodePath: C:/Users/datoo/.minimax/bin/mcode-tools.cmd'))
const bundles = []
for (const name of ['dist/index.js', 'dist/client.js']) {
  const data = await readFile(`${release}/${name}`)
  bundles.push({ name, sha256: createHash('sha256').update(data).digest('hex'), bytes: data.length })
}
const edit = await json(artifact('GALLERY-MEDIA-edit-20260911.json'))
assert.equal(edit.results.length, 2)
const publicGallery = await json(artifact('GALLERY-MEDIA-public-20260911.json'))
assert.equal(publicGallery.negatives.anonymousImage, 401)
assert.equal(publicGallery.negatives.nonAdminVideo, 403)
const video = await json(artifact('GALLERY-MEDIA-video-IAB-20260911.json'))
assert.equal(video.video[0].readyState, 4)
assert.ok(video.video[0].duration > 15 && video.video[0].currentTime >= 15)
const thumbnailRoot = 'C:/Users/datoo/.dsh/chatroom-server/chatroom/thumbnails/v1'
const thumbnails = await Promise.all((await readdir(thumbnailRoot)).filter(name => /^[a-f0-9]{64}\.webp$/.test(name)).map(async name => ({ name, bytes: (await stat(`${thumbnailRoot}/${name}`)).size })))
assert.ok(thumbnails.length >= 3)
const health = await (await fetch('http://127.0.0.1:3181/plugins/deepseek-harness-chatroom/api/health')).json()
assert.equal(health.ready, true); assert.equal(health.diagnostics.healthy, true)
// Use the actual boot-manifest URL including its mandatory revision.
const html = await (await fetch('http://127.0.0.1:3181/', { signal: AbortSignal.timeout(15000) })).text()
const clientUrl = html.match(/"id":"deepseek-harness-chatroom","url":"([^"]+)"/u)?.[1]
assert.ok(clientUrl?.startsWith('/plugins/??'))
const served = await fetch(new URL(clientUrl, 'http://127.0.0.1:3181'), { signal: AbortSignal.timeout(25000) })
assert.equal(served.status, 200)
const code = await served.text()
assert.ok(code.includes('retryClosedRead') && code.includes('selectionJson') && code.includes('/media/videos'))
let publicClient
try {
  const response = await fetch(new URL(clientUrl, 'https://talk.opcvip.net'), { signal: AbortSignal.timeout(25000) })
  const body = await response.text()
  publicClient = { status: response.status, sha256: createHash('sha256').update(body).digest('hex'), matchesOrigin: body === code }
} catch (error) { publicClient = { error: error.cause?.code ?? error.name } }
const evidence = { at: new Date().toISOString(), version, pinnedHost: '0.1.2-rc.1', bundles, health, clientUrl, servedClientSha256: createHash('sha256').update(code).digest('hex'),
  publicClient,
  thumbnails, publicGallery, actualImageEdits: edit.results, existingVideo: video,
  tests: { unit: 372, unitFiles: 42, chromium: 55, chromiumFiles: 13 },
  boundaries: ['No new paid video submitted. Existing H3 imported, saved and played.', 'Rectangular mask is a model constraint, not pixel-exact outside preservation.', '45-second WAN probes are not indefinite endurance.', 'Historical 13:34 initiating trigger remains unknown.', 'Later host migration belongs to the separate upgrade task and needs fresh compatibility acceptance.'] }
await writeFile(artifact('GALLERY-MEDIA-MANIFEST-20260911.json'), JSON.stringify(evidence, null, 2))
console.log(JSON.stringify({ at: evidence.at, version, bundles, thumbnails: thumbnails.length, actualEdits: edit.results.length, video: video.video[0], health, publicClient }))
