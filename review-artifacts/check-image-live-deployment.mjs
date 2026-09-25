import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const home = 'C:/Users/datoo/.dsh'
const profile = `${home}/chatroom-server/profiles/web`
const release = `${profile}/plugin-releases/chatroom-1.5.0-codex.rc1.14`
const sha = async path => createHash('sha256').update(await readFile(path)).digest('hex')
const overlay = await readFile(`${profile}/cordis.patch.yml`, 'utf8')
assert.match(overlay, /- id: chatroom\s+disabled: true/u)
assert.match(overlay, /- id: chatroom-image-release-rc113\s+name: file:\/\/\/C:\/Users\/datoo\/\.dsh\/chatroom-server\/profiles\/web\/plugin-releases\/chatroom-1\.5\.0-codex\.rc1\.14\/dist\/index\.js/u)
assert.match(overlay, /imageGenerationBaseUrl: http:\/\/127\.0\.0\.1:10100\/v1/u)
assert.match(overlay, /imageGenerationModel: gpt-image-2\.5-flare/u)
const metadata = JSON.parse(await readFile(`${release}/package.json`, 'utf8'))
assert.equal(metadata.version, '1.5.0-codex.rc1.14')
const bundles = {}
for (const file of ['dist/index.js', 'dist/client.js']) {
  bundles[file] = await sha(`${release}/${file}`)
  assert.equal(bundles[file], await sha(new URL(`../${file}`, import.meta.url)))
}
assert.equal(bundles['dist/index.js'], await sha(`${profile}/plugin-releases/chatroom-1.5.0-codex.rc1.13/dist/index.js`))
const startupSha256 = await sha(`${home}/service/run-dsh-chatroom.ps1`)
assert.equal(startupSha256, '4dbe5244a55eaf875c80d7069ee8de13232bad24a6ef7b54fda520bcb5cbba3e')
const corePath = 'C:/Users/datoo/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/lib/profile-boot-BTzzdrGY.js'
const coreSha256 = await sha(corePath)
assert.equal(coreSha256, await sha(`${home}/service/runtime-0.1.2-rc.1/lib/profile-boot-BTzzdrGY.js`))
const status = {}
for (const base of ['http://127.0.0.1:3181', 'https://talk.opcvip.net']) {
  const health = await fetch(base + '/plugins/deepseek-harness-chatroom/api/health', {signal:AbortSignal.timeout(15000)})
  assert.equal(health.status, 200)
  assert.deepEqual(await health.json(), {ready:true})
  const anonymousFiles = []
  for (const file of ['2f0179c0-ddae-480b-8d7f-b8661f992ee2','f175a3ab-c161-4242-a116-7d0afce76ac4']) {
    const response = await fetch(base + '/plugins/deepseek-harness-chatroom/api/files/' + file, {signal:AbortSignal.timeout(15000)})
    assert.equal(response.status, 401)
    await response.arrayBuffer()
    anonymousFiles.push(response.status)
  }
  status[base] = {ready:true,anonymousFiles}
}
console.log(JSON.stringify({version:metadata.version,overlaySha256:await sha(`${profile}/cordis.patch.yml`),packageSha256:await sha(`${home}/chatroom-next-test/packs/deepseek-harness-chatroom-1.5.0-codex.rc1.14.tgz`),bundles,hostBundleUnchanged:true,startupSha256,coreSha256,status},null,2))
