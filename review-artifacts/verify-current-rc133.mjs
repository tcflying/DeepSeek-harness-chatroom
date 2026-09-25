import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

// Read-only current-release verifier. It neither authenticates as a user nor
// mutates the production profile, service, rooms, messages, or paid requests.
const version = '1.5.0-codex.rc1.33'
const home = process.env.DSH_CHATROOM_SERVER_HOME ?? 'C:/Users/datoo/.dsh/chatroom-server'
const base = process.env.DSH_CHATROOM_LOCAL_ORIGIN ?? 'http://127.0.0.1:3181'
const release = `${home}/profiles/web/plugin-releases/chatroom-${version}`
const sha256 = value => createHash('sha256').update(value).digest('hex')
const artifact = name => new URL(`./${name}`, import.meta.url)
const text = path => readFile(path, 'utf8')
const json = async path => JSON.parse((await text(path)).replace(/^\uFEFF/u, ''))

const overlay = await text(`${home}/profiles/web/cordis.patch.yml`)
assert.match(overlay, new RegExp(`name: file:///.*?/chatroom-${version.replaceAll('.', '\\.')}/dist/index\\.js`))
assert.equal((await json(`${release}/package.json`)).version, version)

const bundles = []
for (const file of ['dist/index.js', 'dist/client.js']) {
  const local = await readFile(new URL(`../${file}`, import.meta.url))
  const immutable = await readFile(`${release}/${file}`)
  assert.equal(sha256(local), sha256(immutable), `${file}: local bundle differs from immutable rc133 release`)
  bundles.push({ file, sha256: sha256(local), bytes: local.length })
}

const page = await fetch(`${base}/`, { signal: AbortSignal.timeout(10_000) })
assert.equal(page.status, 200, 'local Host root page')
const html = await page.text()
const manifest = /"id":"deepseek-harness-chatroom","url":"([^"]+)"/u.exec(html)
assert.ok(manifest, 'served page must include the chatroom client manifest')
const clientUrl = new URL(manifest[1], base)
const client = await fetch(clientUrl, { signal: AbortSignal.timeout(15_000) })
assert.equal(client.status, 200, 'served chatroom client asset')
const clientCode = await client.text()
assert.ok(clientCode.includes('roomNavigationRevision'), 'served client lacks the rc133 navigation marker')

const healthResponse = await fetch(`${base}/plugins/deepseek-harness-chatroom/api/health`, {
  signal: AbortSignal.timeout(8_000),
})
assert.equal(healthResponse.status, 200, 'chatroom health status')
const health = await healthResponse.json()
assert.equal(health.ready, true, 'chatroom health readiness')
assert.deepEqual(health.diagnostics, { enabled: true, healthy: true, dropped: 0 }, 'chatroom diagnostics health')

const ciPassed = await text(artifact('RC133-check-ci-r2.log'))
assert.match(ciPassed, /Test Files\s+51 passed \(51\)/u)
assert.match(ciPassed, /Tests\s+418 passed \(418\)/u)
assert.match(ciPassed, /Test Files\s+15 passed \(15\)/u)
assert.match(ciPassed, /Tests\s+66 passed \(66\)/u)
assert.match(ciPassed, /Build complete/u)
assert.doesNotMatch(ciPassed, /Command failed|ELIFECYCLE/u)
const ciFirstAttempt = await text(artifact('RC133-check-ci.log'))
assert.match(ciFirstAttempt, /Tests\s+5 failed \| 413 passed \(418\)/u)

const isolated = await json(artifact('RC133-isolated-browser.json'))
assert.equal(isolated.version, version, 'isolated receipt version')
assert.equal(isolated.passed, true, 'isolated browser receipt')
assert.deepEqual(isolated.roles?.[0]?.servedClient, {
  manifest: true,
  status: 200,
  marker: 'roomNavigationRevision',
}, 'isolated served-client receipt')

const publicReceipt = await json(artifact('RC133-public-browser.json'))
assert.equal(publicReceipt.version, version, 'public receipt version')
const publicPassed = publicReceipt.passed === true
const required = {
  immutableBundles: true,
  servedManifest: true,
  health: true,
  ci: true,
  isolatedBrowser: true,
  publicBrowser: publicPassed,
}
const passed = Object.values(required).every(Boolean)
const record = {
  version,
  passed,
  required,
  bundles,
  overlay: { activeRelease: `chatroom-${version}`, sha256: sha256(overlay) },
  servedClient: { url: clientUrl.toString(), marker: 'roomNavigationRevision' },
  health,
  ci: {
    passedReceipt: 'RC133-check-ci-r2.log',
    unit: { files: 51, tests: 418 },
    browser: { files: 15, tests: 66 },
    earlierFailedReceipt: 'RC133-check-ci.log',
  },
  receipts: {
    isolated: { file: 'RC133-isolated-browser.json', passed: true },
    public: {
      file: 'RC133-public-browser.json',
      passed: publicPassed,
      ...(publicPassed ? {} : { error: publicReceipt.error ?? 'receipt did not report passed:true' }),
    },
  },
}
console.log(JSON.stringify(record, null, 2))
if (!passed) process.exitCode = 1
