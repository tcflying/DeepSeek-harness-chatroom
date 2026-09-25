import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

// Read-only rc139 verifier. It never authenticates, changes a profile, sends a
// room message, invokes a provider, or changes a staged/package artifact.
const version = '1.5.0-codex.rc1.39'
const home = process.env.DSH_CHATROOM_SERVER_HOME ?? 'C:/Users/datoo/.dsh/chatroom-server'
const base = process.env.DSH_CHATROOM_LOCAL_ORIGIN ?? 'http://127.0.0.1:3181'
const release = `${home}/profiles/web/plugin-releases/chatroom-${version}`
const sha256 = value => createHash('sha256').update(value).digest('hex')
const artifact = name => new URL(`./${name}`, import.meta.url)
const text = path => readFile(path, 'utf8')
const json = async path => JSON.parse((await text(path)).replace(/^\uFEFF/u, ''))
const required = {}, errors = {}
const errorText = error => error instanceof Error ? error.message : String(error)
const prove = async (name, check) => {
  try { const value = await check(); required[name] = true; return value }
  catch (error) { required[name] = false; errors[name] = errorText(error); return undefined }
}

const localPackage = await prove('localPackage', async () => {
  const manifest = await json(new URL('../package.json', import.meta.url))
  assert.equal(manifest.version, version, 'local package version')
  return manifest.version
})

const overlay = await prove('immutableOverlay', async () => {
  const value = await text(`${home}/profiles/web/cordis.patch.yml`)
  assert.match(value, new RegExp(`name: file:///.*?/chatroom-${version.replaceAll('.', '\\.')}/dist/index\\.js`))
  assert.equal((await json(`${release}/package.json`)).version, version, 'immutable package version')
  return { activeRelease: `chatroom-${version}`, sha256: sha256(value) }
})

const bundles = await prove('immutableBundles', async () => {
  const values = []
  for (const file of ['dist/index.js', 'dist/client.js']) {
    const local = await readFile(new URL(`../${file}`, import.meta.url))
    const immutable = await readFile(`${release}/${file}`)
    assert.equal(sha256(local), sha256(immutable), `${file}: local bundle differs from immutable rc139 release`)
    values.push({ file, sha256: sha256(local), bytes: local.length })
  }
  return values
})

const sourceFromMap = async (map, suffix, localUrl) => {
  const index = map.sources.findIndex(source => source.replaceAll('\\', '/').endsWith(suffix))
  assert.ok(index >= 0, `immutable source map lacks ${suffix}`)
  const source = map.sourcesContent?.[index]
  const local = await text(new URL(localUrl, import.meta.url))
  assert.equal(source, local, `immutable ${suffix} source differs from local source`)
  return { source, sourceMap: map.sources[index], sha256: sha256(source) }
}
const sourceSummary = ({ source, ...summary }) => summary

const sourceMaps = await prove('sourceMaps', async () => {
  const clientMap = await json(`${release}/dist/client.js.map`)
  const hostMap = await json(`${release}/dist/index.js.map`)
  const styles = await sourceFromMap(clientMap, 'src/client/qq2007-styles.ts', '../src/client/qq2007-styles.ts')
  assert.match(styles.source, /\[data-turn-tail\]/u, 'actual Host assistant-slot selector')
  assert.match(styles.source, /flex:1 1 72px/u, 'actual composer-slot flex layout')
  assert.match(styles.source, /scrollbar-gutter:stable/u, 'category scrollbar-gutter rule')
  const status = await sourceFromMap(clientMap, 'src/client/ServerConnectionStatus.tsx', '../src/client/ServerConnectionStatus.tsx')
  assert.match(status.source, /connection\/diagnostic/u, 'connection diagnostics sender')
  const integration = await sourceFromMap(clientMap, 'src/client/index.tsx', '../src/client/index.tsx')
  assert.match(integration.source, /nativeCatalogue: sessions\.list/u, 'native catalogue integration')
  const runtime = await sourceFromMap(clientMap, 'src/client/runtime-diagnostics.ts', '../src/client/runtime-diagnostics.ts')
  assert.match(runtime.source, /MAX_REPORTS_PER_WINDOW = 5/u, 'bounded client runtime reporting')
  assert.match(runtime.source, /never send error text or URL data/u, 'runtime diagnostic privacy boundary')
  const store = await sourceFromMap(clientMap, 'src/client/store.ts', '../src/client/store.ts')
  assert.match(store.source, /reportRuntimeFailure/u, 'store runtime diagnostic reporter wiring')
  assert.match(store.source, /room-selection/u, 'store selection failure classification')
  const gateway = await sourceFromMap(hostMap, 'src/native-gateway.ts', '../src/native-gateway.ts')
  assert.match(gateway.source, /native\.session-list\.complete/u, 'native catalogue completion diagnostics')
  const room = await sourceFromMap(hostMap, 'src/room.ts', '../src/room.ts')
  assert.match(room.source, /Date\.now\(\) - started/u, 'cumulative room-selection timing')
  const diagnostics = await sourceFromMap(hostMap, 'src/diagnostics.ts', '../src/diagnostics.ts')
  assert.match(diagnostics.source, /client\.runtime\.failure/u, 'runtime failure diagnostic schema')
  assert.match(diagnostics.source, /room\.select\.stage/u, 'room-selection stage schema')
  const http = await sourceFromMap(hostMap, 'src/http.ts', '../src/http.ts')
  assert.match(http.source, /connection\/diagnostic/u, 'same-origin diagnostic route')
  assert.match(http.source, /room\.select\.stage/u, 'room-stage journal route')
  return Object.fromEntries(Object.entries({ styles, status, integration, runtime, store, gateway, room, diagnostics, http }).map(([name, value]) => [name, sourceSummary(value)]))
})

const servedClient = await prove('servedManifest', async () => {
  const page = await fetch(`${base}/`, { signal: AbortSignal.timeout(10_000) })
  assert.equal(page.status, 200, 'local Host root page')
  const manifest = /"id":"deepseek-harness-chatroom","url":"([^"]+)"/u.exec(await page.text())
  assert.ok(manifest, 'served page must include the chatroom client manifest')
  const url = new URL(manifest[1], base)
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  assert.equal(response.status, 200, 'served chatroom client asset')
  const code = await response.text()
  for (const marker of ['data-turn-tail', 'dsh-chatroom-assistant-tools', 'flex:1 1 72px', 'scrollbar-gutter:stable', 'runtimeErrorKind', 'runtimeSource', 'window-error', 'unhandled-rejection', 'RangeError']) assert.ok(code.includes(marker), `served client lacks ${marker}`)
  return { url: url.toString(), markers: ['rc139-composer-flex', 'rc139-category-gutter', 'rc139-runtime-diagnostic'] }
})

const health = await prove('health', async () => {
  const response = await fetch(`${base}/plugins/deepseek-harness-chatroom/api/health`, { signal: AbortSignal.timeout(8_000) })
  assert.equal(response.status, 200, 'chatroom health status')
  const value = await response.json()
  assert.equal(value.ready, true, 'chatroom health readiness')
  assert.deepEqual(value.diagnostics, { enabled: true, healthy: true, dropped: 0 }, 'chatroom diagnostics health')
  return value
})

const ci = await prove('ci', async () => {
  const value = await text(artifact('RC139-check-ci.log'))
  for (const marker of [/check:ci/u, /Test Files\s+53 passed \(53\)/u, /Tests\s+462 passed \(462\)/u, /Test Files\s+15 passed \(15\)/u, /Tests\s+77 passed \(77\)/u, /Build complete/u]) assert.match(value, marker)
  assert.doesNotMatch(value, /Command failed|ELIFECYCLE/iu, 'full CI failure marker')
  return { file: 'RC139-check-ci.log' }
})

const receipt = async (name, file) => prove(name, async () => {
  const value = await json(artifact(file))
  assert.equal(value.version, version, `${file} version`)
  assert.equal(value.passed, true, `${file} passed`)
  return { file, passed: true }
})
const isolated = await receipt('isolatedBrowser', 'RC139-isolated-browser.json')
const publicBrowser = await receipt('publicBrowser', 'RC139-public-browser.json')
const iab = await receipt('iab', 'RC139-IAB-live.json')
const reconnect = await receipt('reconnectDirectory', 'RC139-CHATROOM-RECONNECTED.json')

const passed = Object.values(required).every(Boolean)
console.log(JSON.stringify({ version, passed, required, ...(Object.keys(errors).length ? { errors } : {}), localPackage, overlay, bundles, sourceMaps, servedClient, health, ci, receipts: { isolated, publicBrowser, iab, reconnect } }, null, 2))
if (!passed) process.exitCode = 1
