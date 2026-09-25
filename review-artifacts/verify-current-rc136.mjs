import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

// Read-only rc136 verifier. It neither authenticates as a user nor mutates a
// profile, service, room, message, provider request, or staged package.
const version = '1.5.0-codex.rc1.36'
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
    assert.equal(sha256(local), sha256(immutable), `${file}: local bundle differs from immutable rc136 release`)
    values.push({ file, sha256: sha256(local), bytes: local.length })
  }
  return values
})

const nativeRetryBundle = await prove('nativeRetryBundle', async () => {
  const map = await json(`${release}/dist/client.js.map`)
  const sourceIndex = map.sources.findIndex(source => source.endsWith('src/client/native-session-sync.ts'))
  assert.ok(sourceIndex >= 0, 'immutable client source map lacks native-session-sync source')
  const local = await text(new URL('../src/client/native-session-sync.ts', import.meta.url))
  const source = map.sourcesContent?.[sourceIndex]
  assert.equal(source, local, 'immutable native-session-sync source differs from local source')
  assert.match(source, /queuedExplicitRetry:\s*\{ key: string; authenticationEpoch: number \}/u, 'queued retry includes an authentication epoch')
  assert.match(source, /explicitRetry\?\.authenticationEpoch === authenticationEpoch && explicitRetry\.key === currentKey/u, 'same authentication epoch and identity/generation retry guard')
  assert.match(source, /authenticationEpoch \+= 1[\s\S]*?queuedExplicitRetry = undefined/u, 'auth-loss clears queued retry before a same-identity re-login')
  assert.match(source, /queuedExplicitRetry = undefined[\s\S]*?desiredKey = undefined[\s\S]*?requestedKey = undefined[\s\S]*?principal = undefined/u, 'auth-loss clears retry de-duplication state')
  return { source: map.sources[sourceIndex], sha256: sha256(source) }
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
  // The UI marker is continuity-only. nativeRetryBundle above proves rc136.
  assert.ok(code.includes('dsh-chatroom-assistant-actions') && code.includes('仅平台超级管理员可修改。'), 'served client lacks retained assistant-action/auth-aware UI')
  return { url: url.toString(), marker: 'rc135-assistant-actions-and-auth-aware-auto-reply' }
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
  const value = await text(artifact('RC136-check-ci-r2.log'))
  assert.match(value, /check:ci/u, 'full CI command')
  const filePasses = [...value.matchAll(/Test Files\s+\d+ passed \(\d+\)/gu)]
  const testPasses = [...value.matchAll(/Tests\s+\d+ passed \(\d+\)/gu)]
  assert.ok(filePasses.length >= 2, 'unit and browser file results')
  assert.ok(testPasses.length >= 2, 'unit and browser test results')
  assert.match(value, /Build complete/u, 'client build result')
  assert.doesNotMatch(value, /Command failed|ELIFECYCLE|\bfailed\b/iu, 'full CI failure marker')
  return { file: 'RC136-check-ci-r2.log' }
})

const receipt = async (name, file) => prove(name, async () => {
  const value = await json(artifact(file))
  assert.equal(value.version, version, `${file} version`)
  assert.equal(value.passed, true, `${file} passed`)
  return { file, passed: true }
})

const isolated = await receipt('isolatedBrowser', 'RC136-isolated-browser.json')
const publicBrowser = await receipt('publicBrowser', 'RC136-public-browser.json')
const iab = await receipt('iab', 'RC136-IAB-live.json')
const reconnect = await receipt('reconnectDirectory', 'RC136-CHATROOM-RECONNECTED.json')

const passed = Object.values(required).every(Boolean)
console.log(JSON.stringify({
  version,
  passed,
  required,
  ...(Object.keys(errors).length === 0 ? {} : { errors }),
  localPackage,
  bundles,
  nativeRetryBundle,
  overlay: overlay === undefined ? undefined : { activeRelease: `chatroom-${version}`, sha256: sha256(overlay) },
  servedClient,
  health,
  ci,
  receipts: { isolated, publicBrowser, iab, reconnect },
}, null, 2))
if (!passed) process.exitCode = 1
