import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const version = '1.5.0-codex.rc1.49'
const home = 'C:/Users/datoo/.dsh/chatroom-server/'
const overlay = home + 'profiles/web/cordis.patch.yml'
const rollback = home + 'profiles/web/cordis.patch.rc149-prepublish.bak'
const before = await readFile(rollback, 'utf8')
const after = await readFile(overlay, 'utf8')
const oldPath = '/chatroom-1.5.0-codex.rc1.48/dist/index.js'
const newPath = `/chatroom-${version}/dist/index.js`
assert.equal(before.split(oldPath).length, 2)
assert.equal(after.split(newPath).length, 2)
assert.equal(after.replace(newPath, oldPath), before, 'only release path may change')
const sha256 = value => createHash('sha256').update(value).digest('hex')
const payload = bytes => bytes.toString('utf8').replace(/\r\n/gu, '\n')
  .replace(/(?:\n;\n|\n)\/\/# sourceMappingURL=[^\r\n]*[\r\n]*$/u, '')
const service = execFileSync('C:/Program Files/Servy/servy-cli.exe', ['status', '--name', 'dsh-chatroom'], { encoding: 'utf8', windowsHide: true }).trim()
assert.match(service, /Running/u)
const listeners = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command', 'Get-NetTCPConnection -LocalPort 3181,3185 -State Listen | Select-Object LocalPort,OwningProcess | ConvertTo-Json -Compress'], { encoding: 'utf8', windowsHide: true }))
assert.equal(listeners.find(row => row.LocalPort === 3181)?.OwningProcess, 45580)
assert.equal(listeners.find(row => row.LocalPort === 3185)?.OwningProcess, 42372)
const events = (await readFile(home + 'chatroom/diagnostics/events.jsonl', 'utf8')).trim().split('\n').map(line => JSON.parse(line))
const phases = events.filter(row => row.at >= '2026-09-12T18:25:48.916Z' && ['runtime.start', 'runtime.stop'].includes(row.event))
assert.deepEqual(phases.map(row => row.event), ['runtime.stop', 'runtime.start'])
const candidate = await readFile(home + `profiles/web/plugin-releases/chatroom-${version}/dist/client.js`)
assert.equal(sha256(candidate), '4a1963150189006821b0e238fc235997bab5129e345711d2f550d8ae97c45808')
const health = [], clients = []
for (const base of ['http://127.0.0.1:3181', 'https://talk.opcvip.net']) {
  const response = await fetch(base + '/plugins/deepseek-harness-chatroom/api/health', { signal: AbortSignal.timeout(10_000) })
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.ready, true)
  assert.deepEqual(body.diagnostics, { enabled: true, healthy: true, dropped: 0 })
  health.push({ base, at: new Date().toISOString(), status: response.status, ready: body.ready, diagnostics: body.diagnostics })
  const shell = await fetch(base + '/', { signal: AbortSignal.timeout(10_000) })
  assert.equal(shell.status, 200)
  const match = /"id":"deepseek-harness-chatroom","url":"([^"]+)"/u.exec(await shell.text())
  assert.ok(match, 'client manifest absent')
  const bundle = await fetch(new URL(match[1], base), { signal: AbortSignal.timeout(15_000) })
  assert.equal(bundle.status, 200)
  const bytes = Buffer.from(await bundle.arrayBuffer())
  assert.ok(bytes.indexOf(candidate) >= 0 || payload(bytes) === payload(candidate), 'served client is not the full candidate payload')
  clients.push({ base, candidateSha256: sha256(candidate), servedSha256: sha256(bytes), fullPayloadEqual: true,
    normalization: 'Only terminal Host sourceMappingURL/semicolon wrapper and CRLF' })
}
const result = {
  version, at: new Date().toISOString(), deployed: true, service, listeners, phases, health, clients,
  overlay: { onlyReleasePathChanged: true, beforeSha256: sha256(before), afterSha256: sha256(after), rollback },
  hostAndBridgeNotRestarted: true,
  initialReadiness: [
    { at: '2026-09-12T18:25:55.342Z', status: 404, phase: 'old plugin disposed' },
    { at: '2026-09-12T18:26:26.398Z', status: 502, base: 'public', phase: 'replacement loading; local check also exceeded 10 seconds' },
    { at: '2026-09-12T18:26:50.340Z', status: 503, base: 'both', phase: 'initializing' },
    { at: '2026-09-12T18:27:10.794Z', status: 503, base: 'both', phase: 'still initializing' },
    { at: '2026-09-12T18:27:27.854Z', status: 200, base: 'local', phase: 'ready' },
  ],
  releaseDecision: 'Bounded CSS-only plugin repair: 497 unit + 103 browser tests passed with unchanged source; both isolated Host UI and temporary public candidate-CSS Settings checks completed. Their retained browser-close timeouts are not aggregate passes. Live RC149 UI is separately verified after activation.',
  boundaries: ['No DSH core, TUN, global proxy, credentials, account policy or other-plugin file change',
    'No new paid media call, Git push or npm registry publish',
    'Native-catalogue latency and test teardown/IAB failures remain separate unresolved evidence'],
}
await writeFile(new URL('RC149-PUBLICATION.json', import.meta.url), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify({ version, deployed: true, onlyReleasePathChanged: true, health, clients, hostAndBridgeNotRestarted: true }))
