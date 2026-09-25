import assert from 'node:assert/strict'
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const version = '1.5.0-codex.rc1.26'
const root = 'C:/Users/datoo/.dsh/chatroom-server'
const profile = `${root}/profiles/web`, release = `${profile}/plugin-releases/chatroom-${version}`
const prefix = '/plugins/deepseek-harness-chatroom/api', publicBase = 'https://talk.opcvip.net'
const sha = value => createHash('sha256').update(value).digest('hex')
const artifact = name => new URL(`./${name}`, import.meta.url)
const readJson = async path => JSON.parse((await readFile(path, 'utf8')).replace(/^\uFEFF/, ''))
const overlay = await readFile(`${profile}/cordis.patch.yml`, 'utf8')
assert.match(overlay, /chatroom-image-release-rc113\s+name:.*chatroom-1\.5\.0-codex\.rc1\.26\/dist\/index\.js/)
assert.ok(overlay.includes('imageGenerationBaseUrl: http://127.0.0.1:10100/v1'))
assert.ok(overlay.includes('miniMaxCodePath: C:/Users/datoo/.minimax/bin/mcode-tools.cmd'))
const bundles = await Promise.all(['dist/index.js', 'dist/client.js'].map(async name => {
  const data = await readFile(`${release}/${name}`)
  assert.equal(sha(data), sha(await readFile(new URL(`../${name}`, import.meta.url))))
  return { name, bytes: data.length, sha256: sha(data) }
}))
assert.equal((await readJson(`${release}/package.json`)).version, version)
assert.equal(bundles[0].sha256, sha(await readFile(`${profile}/plugin-releases/chatroom-1.5.0-codex.rc1.24/dist/index.js`)))
const health = await fetch('http://127.0.0.1:3181' + prefix + '/health').then(r => r.json())
assert.deepEqual(health, { ready: true, diagnostics: { enabled: true, healthy: true, dropped: 0 } })
const html = await fetch('http://127.0.0.1:3181/', { signal: AbortSignal.timeout(15000) }).then(r => r.text())
const clientUrl = html.match(/"id":"deepseek-harness-chatroom","url":"([^"]+)"/u)?.[1]
assert.ok(clientUrl?.startsWith('/plugins/??'))
const clients = await Promise.all(['http://127.0.0.1:3181', publicBase].map(async base => {
  const response = await fetch(new URL(clientUrl, base), { signal: AbortSignal.timeout(25000) })
  assert.equal(response.status, 200)
  const code = await response.text()
  for (const marker of ['dsh-chatroom-management-dialog', '/connection/diagnostic', 'heartbeat']) assert.ok(code.includes(marker))
  return { base, status: response.status, bytes: Buffer.byteLength(code), sha256: sha(code) }
}))
assert.equal(clients[0].sha256, clients[1].sha256)
const sse = await readJson(artifact('SSE-LIFECYCLE-1789130945562.json'))
assert.equal(sse.results.length, 6)
for (const row of sse.results) {
  assert.equal(row.error, 'probe-complete'); assert.ok(!row.ended)
  assert.ok(row.elapsedMs >= 185000)
  assert.ok(row.frames.filter(f => f.type === 'heartbeat').length >= 12)
}
const browser = await readJson(artifact('RC126-iab-acceptance.json'))
for (const modal of [browser.ai, browser.group, browser.nativeGroup]) {
  assert.equal(modal.topLayer, true); assert.equal(modal.files, true)
  assert.equal(modal.hit, true); assert.equal(modal.overflow, false)
}
assert.equal(browser.ai.loadedMembers, true)
assert.equal(browser.reconnect.after.state.state, 'connected')
assert.deepEqual(browser.reconnect.before.drafts, browser.reconnect.after.drafts)
assert.equal(browser.freshLoad.historyLoading, false)
assert.equal(browser.freshLoad.forcedConnectionWarnings.length, 0)
const secrets = await readJson('C:/Users/datoo/.dsh/service/chatroom-secrets.json')
const login = await fetch(publicBase + prefix + '/auth/login', {
  method: 'POST', headers: { Origin: publicBase, 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: secrets.testUsername, password: secrets.testPassword }), signal: AbortSignal.timeout(25000),
})
assert.equal(login.status, 200)
const cookie = login.headers.getSetCookie().map(v => v.split(';')[0]).join('; ')
await login.arrayBuffer()
const evidence = { at: new Date().toISOString(), version, overlaySha256: sha(overlay), bundles, health, clientUrl, clients, sse, browser, native: [] }
try {
  for (const [label, headers, expected] of [
    ['anonymous', { Origin: publicBase }, 401],
    ['crossOrigin', { Origin: 'https://invalid.example', Cookie: cookie }, 422],
  ]) {
    const response = await fetch(publicBase + prefix + '/connection/diagnostic', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(15000) })
    await response.arrayBuffer(); assert.equal(response.status, expected)
    evidence[label] = response.status
  }
  // The long probe runs independently of the guard's bounded command timeout.
  const nativeFile = (await readdir(new URL('.', import.meta.url))).filter(name => /^NATIVE-ROUTE-\d+\.json$/.test(name)).sort().at(-1)
  assert.ok(nativeFile)
  const native = await readJson(artifact(nativeFile))
  assert.ok(native.at >= '2026-09-11T13:18:00.000Z')
  evidence.native = native.results
  evidence.nativeProbe = nativeFile
  const journal = (await readFile(`${root}/chatroom/diagnostics/events.jsonl`, 'utf8')).trim().split('\n').map(JSON.parse)
  evidence.sseCleanup = sse.results.map(row => {
    const close = journal.find(e => e.event === 'sse.close' && e.operationId === row.operationId)
    assert.ok(close); assert.ok(close.heartbeatCount >= 12)
    return close
  })
  evidence.clientStateReceipts = journal.filter(e => e.event === 'client.connection' && e.at >= '2026-09-11T13:02:27.000Z').slice(-8)
  assert.ok(evidence.clientStateReceipts.some(e => e.connectionState.native === 'connected' && e.connectionState.room === 'online' && e.connectionState.notifications === 'online'))
  evidence.automationState = (await readFile('G:/CodexData/codex-home/automations/automation-4/automation.toml', 'utf8')).match(/^status\s*=\s*"([^"]+)"/m)?.[1]
  evidence.finishedAt = new Date().toISOString()
  await writeFile(artifact('CONNECTION-DIALOGS-MANIFEST-20260911.json'), JSON.stringify(evidence, null, 2))
  for (const route of ['local', 'bridge', 'public-explicit-environment-agent']) {
    const row = evidence.native.find(r => r.route === route)
    assert.ok(row); assert.equal(row.closedByProbe, true); assert.ok(row.elapsedMs >= 155000); assert.ok(row.pings >= 8); assert.equal(row.error, undefined)
  }
  console.log(JSON.stringify({ version, bundles, clients, native: evidence.native, sseCleanup: evidence.sseCleanup.length, automationState: evidence.automationState, manifest: artifact('CONNECTION-DIALOGS-MANIFEST-20260911.json').pathname }))
} finally {
  await fetch(publicBase + prefix + '/auth/logout', { method: 'POST', headers: { Cookie: cookie, Origin: publicBase, 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(15000) }).then(r => r.arrayBuffer()).catch(() => {})
}
