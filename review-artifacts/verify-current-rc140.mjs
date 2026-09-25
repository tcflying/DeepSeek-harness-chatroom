import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

// Read-only rc140 verifier: no login, profile, room, provider, service, or
// release mutation. It exits nonzero until every same-version evidence layer passes.
const version = '1.5.0-codex.rc1.40'
const home = process.env.DSH_CHATROOM_SERVER_HOME ?? 'C:/Users/datoo/.dsh/chatroom-server'
const base = process.env.DSH_CHATROOM_LOCAL_ORIGIN ?? 'http://127.0.0.1:3181'
const release = `${home}/profiles/web/plugin-releases/chatroom-${version}`
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
  const styles = await mapSource(client, 'src/client/qq2007-styles.ts', '../src/client/qq2007-styles.ts')
  assert.match(styles.source, /flex:1 0 100%/u)
  assert.match(styles.source, /flex:1 0 80px/u)
  assert.match(styles.source, /min-width:80px/u)
  assert.match(styles.source, /scrollbar-gutter:stable/u)
  const status = await mapSource(client, 'src/client/ServerConnectionStatus.tsx', '../src/client/ServerConnectionStatus.tsx')
  const integration = await mapSource(client, 'src/client/index.tsx', '../src/client/index.tsx')
  assert.match(integration.source, /nativeCatalogue: sessions\.list/u)
  assert.match(integration.source, /createSessionReentryDiagnostics/u)
  assert.match(integration.source, /try \{ reconcileSession\(\) \} finally \{ leave\(\) \}/u)
  const runtime = await mapSource(client, 'src/client/runtime-diagnostics.ts', '../src/client/runtime-diagnostics.ts')
  assert.match(runtime.source, /runtimeErrorKind/u)
  const reentry = await mapSource(client, 'src/client/session-reentry-diagnostics.ts', '../src/client/session-reentry-diagnostics.ts')
  assert.match(reentry.source, /contentless|frame|count/u)
  const store = await mapSource(client, 'src/client/store.ts', '../src/client/store.ts')
  assert.match(store.source, /reportRuntimeFailure/u)
  const gateway = await mapSource(host, 'src/native-gateway.ts', '../src/native-gateway.ts')
  const room = await mapSource(host, 'src/room.ts', '../src/room.ts')
  assert.match(room.source, /Date\.now\(\) - started/u)
  const diagnostics = await mapSource(host, 'src/diagnostics.ts', '../src/diagnostics.ts')
  assert.match(diagnostics.source, /client\.runtime\.failure/u)
  const http = await mapSource(host, 'src/http.ts', '../src/http.ts')
  assert.match(http.source, /room\.select\.stage/u)
  return Object.fromEntries(Object.entries({ styles, status, integration, runtime, reentry, store, gateway, room, diagnostics, http }).map(([name, value]) => [name, summary(value)]))
})
const served = await prove('servedManifest', async () => {
  const page = await fetch(`${base}/`, { signal: AbortSignal.timeout(10_000) })
  assert.equal(page.status, 200)
  const match = /"id":"deepseek-harness-chatroom","url":"([^"]+)"/u.exec(await page.text())
  assert.ok(match, 'chatroom manifest')
  const url = new URL(match[1], base), response = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  assert.equal(response.status, 200)
  const code = await response.text()
  for (const marker of ['data-turn-tail', 'flex:1 0 100%', 'flex:1 0 80px', 'min-width:80px', 'scrollbar-gutter:stable', 'runtimeErrorKind', 'runtimeSource', 'RangeError']) assert.ok(code.includes(marker), `served ${marker}`)
  return { url: url.toString(), markers: ['rc140-composer-category-runtime'] }
})
const health = await prove('health', async () => {
  const response = await fetch(`${base}/plugins/deepseek-harness-chatroom/api/health`, { signal: AbortSignal.timeout(8_000) })
  assert.equal(response.status, 200)
  const value = await response.json(); assert.equal(value.ready, true)
  assert.deepEqual(value.diagnostics, { enabled: true, healthy: true, dropped: 0 })
  return value
})
const ci = await prove('ci', async () => {
  const value = await text(artifact('RC140-check-ci.log'))
  assert.match(value, /check:ci/u); assert.match(value, /Build complete/u)
  assert.match(value, /Test Files\s+54 passed \(54\)/u); assert.match(value, /Tests\s+467 passed \(467\)/u)
  assert.match(value, /Test Files\s+15 passed \(15\)/u); assert.match(value, /Tests\s+77 passed \(77\)/u)
  assert.doesNotMatch(value, /Command failed|ELIFECYCLE/iu)
  return { file: 'RC140-check-ci.log' }
})
const receipt = async (name, file) => prove(name, async () => {
  const value = await json(artifact(file)); assert.equal(value.version, version); assert.equal(value.passed, true)
  return { file, passed: true }
})
const isolated = await receipt('isolatedBrowser', 'RC140-isolated-browser.json')
const publicBrowser = await receipt('publicBrowser', 'RC140-public-browser.json')
const iab = await receipt('iab', 'RC140-IAB-live.json')
const reconnect = await receipt('reconnectDirectory', 'RC140-CHATROOM-RECONNECTED.json')
const passed = Object.values(required).every(Boolean)
console.log(JSON.stringify({ version, passed, required, ...(Object.keys(errors).length ? { errors } : {}), localPackage, overlay, bundles, sourceMaps, served, health, ci, receipts: { isolated, publicBrowser, iab, reconnect } }, null, 2))
if (!passed) process.exitCode = 1
