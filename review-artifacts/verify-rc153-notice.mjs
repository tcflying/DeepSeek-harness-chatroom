import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const artifact = name => new URL(name, import.meta.url)
const version = '1.5.0-codex.rc1.53'
const previous = '1.5.0-codex.rc1.52'
const home = 'C:/Users/datoo/.dsh/chatroom-server'
const release = `${home}/profiles/web/plugin-releases/chatroom-${version}`
const hash = value => createHash('sha256').update(value).digest('hex')
const json = async path => JSON.parse(await readFile(path, 'utf8'))
const payload = value => value.toString('utf8').replace(/\r\n/gu, '\n')
  .replace(/(?:\n;\n|\n)\/\/# sourceMappingURL=[^\r\n]*[\r\n]*$/u, '')

const ci = await json(artifact('RC153-check-ci-r2.exit.json'))
assert.equal(ci.version, version)
assert.equal(ci.exitCode, 0)
assert.equal(ci.sameSource, true)
for (const [path, expected] of Object.entries(ci.after)) {
  assert.equal(hash(await readFile(new URL(path, root))), expected, `CI drift: ${path}`)
}
const overlay = await readFile(`${home}/profiles/web/cordis.patch.yml`, 'utf8')
const before = await readFile(`${home}/profiles/web/cordis.patch.rc153-prepublish.bak`, 'utf8')
assert.equal(overlay, before.replace(`chatroom-${previous}/dist/index.js`, `chatroom-${version}/dist/index.js`))
assert.equal((await json(`${release}/package.json`)).version, version)
const bundles = {}
for (const file of ['dist/client.js', 'dist/client.js.map', 'dist/index.js', 'dist/index.js.map']) {
  bundles[file] = hash(await readFile(new URL(file, root)))
  assert.equal(hash(await readFile(`${release}/${file}`)), bundles[file])
}
assert.equal(hash(await readFile(`${home}/profiles/web/plugin-releases/chatroom-${previous}/dist/index.js`)), bundles['dist/index.js'])
const surfaces = []
// WAN Node TLS probes failed twice; keep that failed layer below. Actual WAN
// rendering/reload/new-tab evidence comes from the requested in-app browser.
for (const base of ['http://127.0.0.1:3181']) {
  const healthResponse = await fetch(`${base}/plugins/deepseek-harness-chatroom/api/health`, { signal: AbortSignal.timeout(15000) })
  assert.equal(healthResponse.status, 200)
  const health = await healthResponse.json()
  assert.equal(health.ready, true)
  const shell = await fetch(`${base}/`, { signal: AbortSignal.timeout(15000) })
  assert.equal(shell.status, 200)
  const path = /"id":"deepseek-harness-chatroom","url":"([^"]+)"/u.exec(await shell.text())?.[1]
  assert.ok(path, 'served Chatroom module absent')
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(15000) })
  assert.equal(response.status, 200)
  const body = Buffer.from(await response.arrayBuffer())
  assert.equal(payload(body), payload(await readFile(`${release}/dist/client.js`)))
  assert.match(body.toString('utf8'), /welcome-notice/u)
  surfaces.push({ base, health, exactClientPayload: true, sha256: hash(body) })
}
const evidence = { version, at: new Date().toISOString(), localChecksPassed: true,
  fullCi: { file: 'RC153-check-ci-r2.exit.json', sourceUnchanged: true },
  overlay: { persisted: true, onlyReleasePathChanged: true, beforeSha256: hash(before), afterSha256: hash(overlay) },
  hostBundleUnchanged: true, bundles, surfaces,
  publicNodeTlsProbe: { passed: false, attempts: 2, error: 'TypeError: fetch failed; cause: read ECONNRESET (-4077), TLSWrap.onStreamRead' },
  boundary: 'Local package/config/served-payload proof only; no WAN Node transport pass. Actual IAB startup and reload proof is recorded separately.' }
await writeFile(artifact('RC153-notice-deployment.json'), `${JSON.stringify(evidence, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify(evidence, null, 2))
