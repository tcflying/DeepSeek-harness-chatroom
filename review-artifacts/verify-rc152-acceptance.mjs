// Evidence reconciliation only. Does not rerun browser actions or mutate production.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const root = new URL('../', import.meta.url)
const sha = async path => createHash('sha256').update(await readFile(path)).digest('hex')
const json = async name => JSON.parse(await readFile(new URL(name, import.meta.url), 'utf8'))
const version = '1.5.0-codex.rc1.52'
const ci = await json('RC152-check-ci-r2.exit.json')
assert.equal(ci.exitCode, 0); assert.equal(ci.sameSource, true)
for (const [file, hash] of Object.entries(ci.after)) assert.equal(await sha(new URL(file, root)), hash, `source drift: ${file}`)
const publication = await json('RC152-PUBLICATION.json')
assert.equal(publication.deployed, true)
const runtime = new URL('file:///C:/Users/datoo/.dsh/chatroom-server/profiles/web/plugin-releases/chatroom-1.5.0-codex.rc1.52/')
const bundles = {}
for (const file of ['dist/client.js', 'dist/client.js.map', 'dist/index.js', 'dist/index.js.map']) {
  bundles[file] = await sha(new URL(file, root))
  assert.equal(bundles[file], await sha(new URL(file, runtime)), `immutable runtime mismatch: ${file}`)
}
const isolated = await json('RC152-isolated-browser-r1.json')
const member = await json('RC152-public-browser-r3.json')
const admin = await json('RC152-public-browser-r5.json')
for (const proof of [isolated, member, admin]) {
  assert.equal(proof.version, version); assert.equal(proof.passed, true)
  assert.equal(proof.browserCleanup?.contextsRemaining, 0)
  assert.ok(proof.browserCleanup?.completedAt)
}
assert.equal(member.roles[0].deepLink.nativeSelected, true)
assert.ok(member.roles[0].rpc.every(r => r.status === 403))
assert.ok(Object.values(admin.roles[0].stages).every(r => r.passed === true))
const iab = await json('RC152-IAB-after.json')
assert.equal(iab.passed, true); assert.equal(iab.reconnect.centerHit, true)
const observer = await json('RC152-observer-live.json')
assert.equal(observer.transport.windowSeconds, 300)
assert.equal(observer.evidenceHealthy, true)
assert.ok(observer.services.every(r => r.healthy === true))
const receipt = { at: new Date().toISOString(), version, verifiedClaims: ['current full CI/source hashes', 'unchanged immutable production bundles', 'isolated Host', 'public member and admin acceptance', 'IAB collapsed reconnect geometry and click', 'updated one-shot observer invocation'], bundles,
  evidence: ['RC152-check-ci-r2.exit.json', 'RC152-PUBLICATION.json', 'RC152-isolated-browser-r1.json', 'RC152-public-browser-r3.json', 'RC152-public-browser-r5.json', 'RC152-IAB-after.json', 'RC152-observer-live.json'],
  retainedFailures: ['RC151-public-browser-r1.json', 'RC152-public-super-admin-320-narrow-geometry-probe-r2.json', 'RC152-public-browser-r4.json', 'RC152-observer-red.json'],
  rootCauseClosed: false, unresolved: ['Historical 13:34 initiating process-exit trigger lacks contemporaneous evidence', 'Intermittent public deep-link timeouts did not recur in the latest role acceptance; failed response-to-selection transitions remain unattributed'],
  recurringReminder: 'PAUSED; not changed', paidModelCallsThisContinuation: 0, passed: true }
await writeFile(new URL('RC152-ACCEPTANCE.json', import.meta.url), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify({ passed: true, version, rootCauseClosed: false, evidenceCount: receipt.evidence.length }))
