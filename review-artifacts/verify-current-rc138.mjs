import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

// Read-only rc138 verifier. It neither authenticates as a user nor mutates a
// profile, service, room, message, provider request, or staged package.
const version = '1.5.0-codex.rc1.38'
const home = process.env.DSH_CHATROOM_SERVER_HOME ?? 'C:/Users/datoo/.dsh/chatroom-server'
const base = process.env.DSH_CHATROOM_LOCAL_ORIGIN ?? 'http://127.0.0.1:3181'
const release = `${home}/profiles/web/plugin-releases/chatroom-${version}`
const sha256 = value => createHash('sha256').update(value).digest('hex')
const artifact = name => new URL(`./${name}`, import.meta.url)
const text = path => readFile(path, 'utf8')
const json = async path => JSON.parse((await text(path)).replace(/^\uFEFF/u, ''))
const errorText = error => error instanceof Error ? error.message : String(error)

const required = {}
const errors = {}
const prove = async (name, check) => {
  try {
    const value = await check()
    required[name] = true
    return value
  } catch (error) {
    required[name] = false
    errors[name] = errorText(error)
    return undefined
  }
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
  return value
})

const bundles = await prove('immutableBundles', async () => {
  const values = []
  for (const file of ['dist/index.js', 'dist/client.js']) {
    const local = await readFile(new URL(`../${file}`, import.meta.url))
    const immutable = await readFile(`${release}/${file}`)
    assert.equal(sha256(local), sha256(immutable), `${file}: local bundle differs from immutable rc138 release`)
    values.push({ file, sha256: sha256(local), bytes: local.length })
  }
  return values
})

const sourceFromMap = async (map, suffix, localUrl) => {
  const index = map.sources.findIndex(source => source.replaceAll('\\', '/').endsWith(suffix))
  assert.ok(index >= 0, `immutable source map lacks ${suffix}`)
  const local = await text(new URL(localUrl, import.meta.url))
  const source = map.sourcesContent?.[index]
  assert.equal(source, local, `immutable ${suffix} source differs from local source`)
  return { source, mapSource: map.sources[index], sha256: sha256(source) }
}

const sourceMaps = await prove('sourceMaps', async () => {
  const clientMap = await json(`${release}/dist/client.js.map`)
  const hostMap = await json(`${release}/dist/index.js.map`)
  const styles = await sourceFromMap(clientMap, 'src/client/qq2007-styles.ts', '../src/client/qq2007-styles.ts')
  assert.match(styles.source, /\[data-turn-tail\]/u, 'stable actual-Host assistant-slot selector')
  assert.match(styles.source, /\.dsh-chatroom-assistant-tools \{ flex:1 0 100%; width:100%; \}/u, 'assistant tools full-width flex rule')
  assert.match(styles.source, /conversation\.message\.images/u, 'native human-image stack cap rule')
  const status = await sourceFromMap(clientMap, 'src/client/ServerConnectionStatus.tsx', '../src/client/ServerConnectionStatus.tsx')
  assert.match(status.source, /cataloguePending/u, 'catalogue-pending connection state')
  assert.match(status.source, /正在同步会话目录/u, 'catalogue-sync visible label')
  assert.match(status.source, /目录同步超时 · 请重连/u, 'catalogue timeout visible label')
  const integration = await sourceFromMap(clientMap, 'src/client/index.tsx', '../src/client/index.tsx')
  assert.match(integration.source, /nativeCatalogue: sessions\.list/u, 'status receives native catalogue')
  const gateway = await sourceFromMap(hostMap, 'src/native-gateway.ts', '../src/native-gateway.ts')
  assert.match(gateway.source, /createNativeSessionAccessSnapshot/u, 'request-local native session access snapshot')
  assert.match(gateway.source, /headers: request\.headers/u, 'native gateway preserves each request headers')
  assert.match(gateway.source, /native\.session-list\.timeout/u, 'session-list timeout diagnostic')
  assert.match(gateway.source, /native\.session-list\.complete/u, 'session-list complete diagnostic')
  const room = await sourceFromMap(hostMap, 'src/room.ts', '../src/room.ts')
  assert.match(room.source, /createNativeSessionAccessSnapshot/u, 'catalogue scan factory')
  assert.match(room.source, /listNativeSessionHeadersOnce/u, 'header-directory scan')
  const diagnostics = await sourceFromMap(hostMap, 'src/diagnostics.ts', '../src/diagnostics.ts')
  assert.match(diagnostics.source, /cumulative-from-request-start/u, 'cumulative session-list timing')
  assert.match(diagnostics.source, /native\.session-list\.complete/u, 'complete diagnostic schema')
  return { styles, status, integration, gateway, room, diagnostics }
})

const servedClient = await prove('servedManifest', async () => {
  const page = await fetch(`${base}/`, { signal: AbortSignal.timeout(10_000) })
  assert.equal(page.status, 200, 'local Host root page')
  const manifest = /"id":"deepseek-harness-chatroom","url":"([^"]+)"/u.exec(await page.text())
  assert.ok(manifest, 'served page must include the chatroom client manifest')
  const url = new URL(manifest[1], base)
  const client = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  assert.equal(client.status, 200, 'served chatroom client asset')
  const code = await client.text()
  assert.ok(code.includes('data-turn-tail') && code.includes('dsh-chatroom-assistant-tools') && code.includes('flex:1 0 100%'), 'served client lacks rc138 stable-slot rail markers')
  assert.ok(code.includes('正在同步会话目录') && code.includes('目录同步超时 · 请重连'), 'served client lacks rc138 catalogue status markers')
  return { url: url.toString(), markers: ['rc138-stable-turn-tail-action-slot', 'rc138-catalogue-pending-status'] }
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
  const value = await text(artifact('RC138-check-ci.log'))
  assert.match(value, /check:ci/u, 'full CI command')
  assert.match(value, /Test Files\s+52 passed \(52\)/u, 'unit file result')
  assert.match(value, /Tests\s+447 passed \(447\)/u, 'unit test result')
  assert.match(value, /Test Files\s+15 passed \(15\)/u, 'browser file result')
  assert.match(value, /Tests\s+75 passed \(75\)/u, 'browser test result')
  assert.match(value, /Build complete/u, 'client build result')
  assert.doesNotMatch(value, /Command failed|ELIFECYCLE/iu, 'full CI failure marker')
  return { file: 'RC138-check-ci.log' }
})

const receipt = async (name, file) => prove(name, async () => {
  const value = await json(artifact(file))
  assert.equal(value.version, version, `${file} version`)
  assert.equal(value.passed, true, `${file} passed`)
  return { file, passed: true }
})

const isolated = await receipt('isolatedBrowser', 'RC138-isolated-browser.json')
const publicBrowser = await receipt('publicBrowser', 'RC138-public-browser.json')
const iab = await receipt('iab', 'RC138-IAB-live.json')
const reconnect = await receipt('reconnectDirectory', 'RC138-CHATROOM-RECONNECTED.json')

const passed = Object.values(required).every(Boolean)
console.log(JSON.stringify({
  version,
  passed,
  required,
  ...(Object.keys(errors).length === 0 ? {} : { errors }),
  localPackage,
  bundles,
  sourceMaps,
  overlay: overlay === undefined ? undefined : { activeRelease: `chatroom-${version}`, sha256: sha256(overlay) },
  servedClient,
  health,
  ci,
  receipts: { isolated, publicBrowser, iab, reconnect },
}, null, 2))
if (!passed) process.exitCode = 1
