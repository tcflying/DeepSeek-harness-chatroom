import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

// Read-only rc144 verifier. It never mutates login, rooms, providers, or service state.
const version = '1.5.0-codex.rc1.44'
const home = process.env.DSH_CHATROOM_SERVER_HOME ?? 'C:/Users/datoo/.dsh/chatroom-server'
const base = process.env.DSH_CHATROOM_LOCAL_ORIGIN ?? 'http://127.0.0.1:3181'
const release = `${home}/profiles/web/plugin-releases/chatroom-${version}`
const ciReceipt = process.env.DSH_RC144_CI_RECEIPT ?? 'RC144-check-ci-r2.log'
assert.match(ciReceipt, /^RC144-check-ci(?:-r\d+)?\.log$/u, 'CI receipt name')
const ciExitReceipt = ciReceipt.replace(/\.log$/u, '.exit.json')
const sha256 = value => createHash('sha256').update(value).digest('hex')
const artifact = name => new URL(`./${name}`, import.meta.url)
const text = path => readFile(path, 'utf8')
const json = async path => JSON.parse((await text(path)).replace(/^\uFEFF/u, ''))
const required = {}, errors = {}
const prove = async (name, check) => {
  try { const value = await check(); required[name] = true; return value }
  catch (error) { required[name] = false; errors[name] = error instanceof Error ? error.message : String(error); return undefined }
}
const mapSource = async (map, suffix, localUrl) => {
  const index = map.sources.findIndex(source => source.replaceAll('\\', '/').endsWith(suffix))
  assert.ok(index >= 0, `source map lacks ${suffix}`)
  const source = map.sourcesContent?.[index]
  assert.equal(source, await text(new URL(localUrl, import.meta.url)), `${suffix} differs from local source`)
  return { source, sourceMap: map.sources[index], sha256: sha256(source) }
}
const summary = ({ source, ...value }) => value

const localPackage = await prove('localPackage', async () => {
  const manifest = await json(new URL('../package.json', import.meta.url))
  assert.equal(manifest.version, version)
  return manifest.version
})
const overlay = await prove('immutableOverlay', async () => {
  const value = await text(`${home}/profiles/web/cordis.patch.yml`)
  assert.match(value, new RegExp(`name: file:///.*?/chatroom-${version.replaceAll('.', '\\.')}/dist/index\\.js`))
  assert.equal((await json(`${release}/package.json`)).version, version)
  return { activeRelease: `chatroom-${version}`, sha256: sha256(value) }
})
const bundles = await prove('immutableBundles', async () => {
  const values = []
  for (const file of ['dist/index.js', 'dist/client.js']) {
    const local = await readFile(new URL(`../${file}`, import.meta.url))
    const immutable = await readFile(`${release}/${file}`)
    assert.equal(sha256(local), sha256(immutable), `${file} hash`)
    values.push({ file, sha256: sha256(local), bytes: local.length })
  }
  return values
})
const sourceMaps = await prove('sourceMaps', async () => {
  const client = await json(`${release}/dist/client.js.map`), host = await json(`${release}/dist/index.js.map`)
  const accountPanels = await mapSource(client, 'src/client/ChatroomAccountPanels.tsx', '../src/client/ChatroomAccountPanels.tsx')
  const responsive = await mapSource(client, 'src/client/responsive-styles.ts', '../src/client/responsive-styles.ts')
  const chatroomStyles = await mapSource(client, 'src/client/styles.ts', '../src/client/styles.ts')
  const sidebarRooms = await mapSource(client, 'src/client/sidebar-rooms.ts', '../src/client/sidebar-rooms.ts')
  assert.match(sidebarRooms.source, /if \(disposed \|\| scheduled\) return/u)
  const qqStyles = await mapSource(client, 'src/client/qq2007-styles.ts', '../src/client/qq2007-styles.ts')
  assert.match(qqStyles.source, /pointer-events:none/u)
  const integration = await mapSource(client, 'src/client/index.tsx', '../src/client/index.tsx')
  assert.match(integration.source, /createSessionReentryDiagnostics/u)
  const runtime = await mapSource(client, 'src/client/runtime-diagnostics.ts', '../src/client/runtime-diagnostics.ts')
  assert.match(runtime.source, /runtimeErrorKind/u)
  assert.match(runtime.source, /rangeErrorEvidence/u)
  const store = await mapSource(client, 'src/client/store.ts', '../src/client/store.ts')
  assert.match(store.source, /if \(!nativeSelectionChanged && this\.snapshot\.room === undefined\) return/u)
  const gateway = await mapSource(host, 'src/native-gateway.ts', '../src/native-gateway.ts')
  const room = await mapSource(host, 'src/room.ts', '../src/room.ts')
  assert.match(room.source, /Date\.now\(\) - started/u)
  const diagnostics = await mapSource(host, 'src/diagnostics.ts', '../src/diagnostics.ts')
  assert.match(diagnostics.source, /client\.runtime\.failure/u)
  assert.match(diagnostics.source, /sanitizeRangeErrorEvidence/u)
  const http = await mapSource(host, 'src/http.ts', '../src/http.ts')
  assert.match(http.source, /room\.select\.stage/u)
  assert.match(http.source, /sanitizeRangeErrorEvidence/u)
  const runtimeFailureEvidence = await mapSource(host, 'src/runtime-failure-evidence.ts', '../src/runtime-failure-evidence.ts')
  assert.match(runtimeFailureEvidence.source, /SAFE_FUNCTIONS/u)
  assert.match(runtimeFailureEvidence.source, /sanitizeRangeErrorEvidence/u)
  return Object.fromEntries(Object.entries({ accountPanels, responsive, chatroomStyles, sidebarRooms, qqStyles, integration, runtime, store, gateway, room, diagnostics, http, runtimeFailureEvidence }).map(([name, value]) => [name, summary(value)]))
})
const served = await prove('servedManifest', async () => {
  const page = await fetch(`${base}/`, { signal: AbortSignal.timeout(10_000) })
  assert.equal(page.status, 200)
  const match = /"id":"deepseek-harness-chatroom","url":"([^"]+)"/u.exec(await page.text())
  assert.ok(match, 'chatroom manifest')
  const url = new URL(match[1], base), response = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  assert.equal(response.status, 200)
  const code = await response.text()
  for (const marker of ['sidebar.brand.mark', 'pointer-events:none', 'runtimeErrorKind', 'runtimeSource', 'RangeError']) assert.ok(code.includes(marker), `served ${marker}`)
  return { url: url.toString(), markers: ['rc144-settings-account-card-layout'] }
})
const health = await prove('health', async () => {
  const response = await fetch(`${base}/plugins/deepseek-harness-chatroom/api/health`, { signal: AbortSignal.timeout(8_000) })
  assert.equal(response.status, 200)
  const value = await response.json(); assert.equal(value.ready, true)
  assert.deepEqual(value.diagnostics, { enabled: true, healthy: true, dropped: 0 })
  return value
})
const ci = await prove('ci', async () => {
  const value = await text(artifact(ciReceipt))
  assert.match(value, /check:ci/u); assert.match(value, /> deepseek-harness-chatroom@1\.5\.0-codex\.rc1\.44 typecheck/u)
  assert.match(value, /Test Files\s+55 passed \(55\)\s+Tests\s+477 passed \(477\)/u, 'unit summary')
  const browser = value.slice(value.indexOf('test:browser'))
  assert.match(browser, /Test Files\s+16 passed \(16\)\s+Tests\s+85 passed \(85\)/u, 'browser summary')
  assert.match(value, /Build complete/u)
  assert.doesNotMatch(value, /Command failed|ELIFECYCLE/iu)
  const exit = await json(artifact(ciExitReceipt))
  assert.equal(exit.log, ciReceipt, 'CI exit receipt log')
  assert.equal(exit.exitCode, 0, 'CI child must naturally close with exit code 0')
  assert.match(exit.closedAt, /^\d{4}-\d\d-\d\dT/u, 'CI close timestamp')
  assert.equal(exit.samePackage, true, 'package changed while CI ran')
  assert.equal(exit.sameSource, true, 'candidate source changed while CI ran')
  assert.equal(exit.packageSha256, sha256(await readFile(new URL('../package.json', import.meta.url))), 'CI package hash')
  for (const file of [
    'src/client/ChatroomAccountPanels.tsx', 'src/client/responsive-styles.ts', 'src/client/styles.ts',
    'src/client/runtime-diagnostics.ts', 'src/diagnostics.ts', 'src/http.ts', 'src/runtime-failure-evidence.ts',
  ]) {
    const localHash = sha256(await readFile(new URL(`../${file}`, import.meta.url)))
    assert.equal(exit.sourceSha256?.[file], localHash, `CI source hash ${file}`)
    assert.equal(exit.completedSourceSha256?.[file], localHash, `CI completed source hash ${file}`)
  }
  assert.equal(exit.completedPackageSha256, exit.packageSha256, 'CI completed package hash')
  return { file: ciReceipt, exitReceipt: ciExitReceipt, closedAt: exit.closedAt }
})
const receipt = async (name, file) => prove(name, async () => {
  const value = await json(artifact(file)); assert.equal(value.version, version); assert.equal(value.passed, true)
  return { file, passed: true }
})
const isolated = await receipt('isolatedBrowser', 'RC144-isolated-browser.json')
const publicBrowser = await receipt('publicBrowser', 'RC144-public-browser.json')
const iab = await receipt('iab', 'RC144-IAB-live.json')
const reconnect = await receipt('reconnectDirectory', 'RC144-CHATROOM-RECONNECTED.json')
const passed = Object.values(required).every(Boolean)
console.log(JSON.stringify({ version, passed, required, ...(Object.keys(errors).length ? { errors } : {}), localPackage, overlay, bundles, sourceMaps, served, health, ci, receipts: { isolated, publicBrowser, iab, reconnect } }, null, 2))
if (!passed) process.exitCode = 1
