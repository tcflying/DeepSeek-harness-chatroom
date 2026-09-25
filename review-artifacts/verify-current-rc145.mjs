import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'

// Read-only evidence aggregation. Missing/failed user-surface proof remains failed.
const version = process.env.RC_VERSION ?? '1.5.0-codex.rc1.45'
const revision = /^1\.5\.0-codex\.rc1\.(\d+)$/u.exec(version)?.[1]
assert.ok(revision, 'invalid candidate version')
const releaseName = `RC1${revision}`
const isolatedSuffix = process.env.RC_ISOLATED_RECEIPT_SUFFIX ?? ''
assert.match(isolatedSuffix, /^(?:|-[a-z0-9]+)$/u)
const publicSuffix = process.env.RC_PUBLIC_RECEIPT_SUFFIX ?? ''
const iabSuffix = process.env.RC_IAB_RECEIPT_SUFFIX ?? ''
assert.match(publicSuffix, /^(?:|-[a-z0-9]+)$/u)
assert.match(iabSuffix, /^(?:|-[a-z0-9]+)$/u)
const home = process.env.DSH_CHATROOM_SERVER_HOME ?? 'C:/Users/datoo/.dsh/chatroom-server'
const base = process.env.DSH_CHATROOM_LOCAL_ORIGIN ?? 'http://127.0.0.1:3181'
const release = `${home}/profiles/web/plugin-releases/chatroom-${version}`
const ciName = process.env.RC_CI_RECEIPT ?? process.env.DSH_RC145_CI_RECEIPT ?? `${releaseName}-check-ci.log`
assert.match(ciName, new RegExp(`^${releaseName}-check-ci(?:-r\\d+)?\\.log$`, 'u'))
const artifact = name => new URL(name, import.meta.url)
const source = name => new URL(`../${name}`, import.meta.url)
const text = path => readFile(path, 'utf8')
const json = async path => JSON.parse((await text(path)).replace(/^\uFEFF/u, ''))
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const payload = bytes => Buffer.from(bytes.toString('utf8').replace(/\r\n/gu, '\n')
  .replace(/(?:\n;\n|\n)\/\/# sourceMappingURL=[^\r\n]*[\r\n]*$/u, ''), 'utf8')
const checks = {}
async function prove(name, action) {
  try { checks[name] = { passed: true, evidence: await action() } }
  catch (error) { checks[name] = { passed: false, error: error.message } }
}
await prove('candidateAndImmutable', async () => {
  assert.equal((await json(source('package.json'))).version, version)
  assert.equal((await json(`${release}/package.json`)).version, version)
  const files = {}
  for (const file of ['dist/index.js', 'dist/client.js', 'dist/index.js.map', 'dist/client.js.map']) {
    const local = await readFile(source(file))
    assert.equal(sha256(local), sha256(await readFile(`${release}/${file}`)), `${file}: immutable mismatch`)
    files[file] = sha256(local)
  }
  return files
})
await prove('effectiveOverlay', async () => {
  const overlay = await text(`${home}/profiles/web/cordis.patch.yml`)
  const entries = overlay.split(/\r?\n(?=\s{0,4}- (?:id|insert):)/u)
  const selected = entries.find(entry => entry.includes(`/chatroom-${version}/dist/index.js`))
  assert.ok(selected && !/\n\s+disabled: true/u.test(selected), 'candidate overlay missing or disabled')
  return { version, overlaySha256: sha256(overlay) }
})
await prove('sourceMaps', async () => {
  const result = {}
  for (const file of ['dist/client.js.map', 'dist/index.js.map']) {
    const map = await json(`${release}/${file}`)
    let count = 0
    for (let i = 0; i < map.sources.length; i++) {
      const path = map.sources[i].replaceAll('\\', '/')
      const match = /(?:^|\/)src\/(.+)$/u.exec(path)
      if (!match || path.includes('node_modules')) continue
      assert.equal(map.sourcesContent[i], await text(source(`src/${match[1]}`)), `${file}: ${path}`)
      count++
    }
    assert.ok(count > 0, `${file}: no project source`)
    result[file] = count
  }
  return result
})
await prove('servedExactClient', async () => {
  const shell = await fetch(`${base}/`, { signal: AbortSignal.timeout(10_000) })
  assert.equal(shell.status, 200)
  const match = /"id":"deepseek-harness-chatroom","url":"([^"]+)"/u.exec(await shell.text())
  assert.ok(match, 'chatroom client manifest absent')
  const response = await fetch(new URL(match[1], base), { signal: AbortSignal.timeout(15_000) })
  assert.equal(response.status, 200)
  const bytes = Buffer.from(await response.arrayBuffer())
  const candidate = await readFile(`${release}/dist/client.js`)
  const embeddedAt = bytes.indexOf(candidate)
  const samePayload = payload(bytes).equals(payload(candidate))
  assert.ok(embeddedAt >= 0 || samePayload, 'served wrapper lacks exact immutable client payload')
  return { candidateSha256: sha256(candidate), servedSha256: sha256(bytes), embeddedAt,
    samePayload, payloadSha256: sha256(payload(bytes)),
    normalization: 'Only terminal Host semicolon/sourceMappingURL wrapper and CRLF; full remaining payload equality' }
})
await prove('health', async () => {
  const response = await fetch(`${base}/plugins/deepseek-harness-chatroom/api/health`, { signal: AbortSignal.timeout(8_000) })
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.ready, true)
  assert.deepEqual(body.diagnostics, { enabled: true, healthy: true, dropped: 0 })
  return { ready: body.ready, diagnostics: body.diagnostics }
})
await prove('ci', async () => {
  const log = await text(artifact(ciName))
  const receipt = await json(artifact(ciName.replace(/\.log$/u, '.exit.json')))
  assert.equal(receipt.version, version)
  assert.equal(receipt.log, ciName)
  assert.equal(receipt.exitCode, 0)
  assert.equal(receipt.sameSource, true)
  assert.match(receipt.closedAt, /^\d{4}-\d\d-\d\dT/u)
  assert.match(log, /Build complete/u)
  const summaries = [...log.matchAll(/Test Files\s+(\d+) passed \((\d+)\)\s+Tests\s+(\d+) passed \((\d+)\)/gu)]
  assert.equal(summaries.length, 2, 'unit and browser summaries required')
  for (const row of summaries) { assert.equal(row[1], row[2]); assert.equal(row[3], row[4]) }
  for (const [file, hash] of Object.entries(receipt.before)) {
    assert.equal(receipt.after[file], hash, `CI source changed: ${file}`)
    assert.equal(sha256(await readFile(source(file))), hash, `CI stale: ${file}`)
  }
  return { log: ciName, closedAt: receipt.closedAt, summaries: summaries.map(row => ({ files: +row[1], tests: +row[3] })) }
})
for (const [name, file] of Object.entries({ isolated: `${releaseName}-isolated-browser${isolatedSuffix}.json`, public: `${releaseName}-public-browser${publicSuffix}.json`, iab: `${releaseName}-IAB-live${iabSuffix}.json`, reconnect: `${releaseName}-CHATROOM-RECONNECTED${publicSuffix}.json` })) {
  await prove(name, async () => {
    const receipt = await json(artifact(file))
    assert.equal(receipt.version, version)
    assert.equal(receipt.passed, true)
    assert.equal(receipt.error, undefined, 'a retained runtime or teardown error cannot be accepted')
    return { file }
  })
}
const passed = Object.values(checks).every(check => check.passed)
const result = { version, at: new Date().toISOString(), passed, checks }
if (process.env.RC_AGGREGATE_RECEIPT) {
  assert.match(process.env.RC_AGGREGATE_RECEIPT, new RegExp(`^${releaseName}-aggregate(?:-[a-z0-9]+)?\\.json$`, 'u'))
  await writeFile(artifact(process.env.RC_AGGREGATE_RECEIPT), `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' })
}
console.log(JSON.stringify(result, null, 2))
if (!passed) process.exitCode = 1
