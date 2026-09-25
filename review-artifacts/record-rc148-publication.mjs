import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const home = 'C:/Users/datoo/.dsh/chatroom-server/'
const overlay = home + 'profiles/web/cordis.patch.yml'
const rollback = home + 'profiles/web/cordis.patch.rc148-prepublish.bak'
const before = await readFile(rollback, 'utf8')
const after = await readFile(overlay, 'utf8')
const oldPath = '/chatroom-1.5.0-codex.rc1.47/dist/index.js'
const newPath = '/chatroom-1.5.0-codex.rc1.48/dist/index.js'
assert.equal(before.split(oldPath).length, 2)
assert.equal(after.split(newPath).length, 2)
assert.equal(after.replace(newPath, oldPath), before, 'only release path may change')
const sha256 = value => createHash('sha256').update(value).digest('hex')
const service = execFileSync('C:/Program Files/Servy/servy-cli.exe', ['status', '--name', 'dsh-chatroom'], { encoding: 'utf8', windowsHide: true }).trim()
assert.match(service, /Running/u)
const listeners = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command', 'Get-NetTCPConnection -LocalPort 3181,3185 -State Listen | Select-Object LocalPort,OwningProcess | ConvertTo-Json -Compress'], { encoding: 'utf8', windowsHide: true }))
assert.equal(listeners.find(row => row.LocalPort === 3181)?.OwningProcess, 45580)
assert.equal(listeners.find(row => row.LocalPort === 3185)?.OwningProcess, 42372)
const events = (await readFile(home + 'chatroom/diagnostics/events.jsonl', 'utf8')).trim().split('\n').map(line => JSON.parse(line))
const phases = events.filter(row => row.at >= '2026-09-12T17:36:55Z' && ['runtime.start', 'runtime.stop'].includes(row.event))
assert.deepEqual(phases.map(row => row.event), ['runtime.stop', 'runtime.start'])
const health = []
for (const base of ['http://127.0.0.1:3181', 'https://talk.opcvip.net']) {
  const response = await fetch(base + '/plugins/deepseek-harness-chatroom/api/health', { signal: AbortSignal.timeout(10_000) })
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.ready, true)
  assert.deepEqual(body.diagnostics, { enabled: true, healthy: true, dropped: 0 })
  health.push({ base, at: new Date().toISOString(), status: response.status, ready: body.ready, diagnostics: body.diagnostics })
}
const result = {
  version: '1.5.0-codex.rc1.48', at: new Date().toISOString(), deployed: true,
  scope: 'Continuation of authorized plugin repair/publication; TUN and low-level IAB work declined',
  overlay: { onlyReleasePathChanged: true, beforeSha256: sha256(before), afterSha256: sha256(after), rollback },
  phases, service, listeners, health, hostAndBridgeNotRestarted: true,
  initialReadiness: [{ at: '2026-09-12T17:36:59.835Z', status: 404, phase: 'old plugin disposed' },
    { at: '2026-09-12T17:37:19.000Z', status: 503, phase: 'initializing' },
    { at: '2026-09-12T17:37:38.194Z', status: 200, phase: 'ready' }],
  boundaries: ['No DSH core, global network, credentials, account policy or other-plugin change',
    'No new paid generation, Git push or npm registry publish', 'Headless public acceptance is separate from user-paused IAB work'],
}
await writeFile(new URL('RC148-PUBLICATION.json', import.meta.url), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify({ deployed: true, version: result.version, onlyReleasePathChanged: true, health, hostAndBridgeNotRestarted: true }))
