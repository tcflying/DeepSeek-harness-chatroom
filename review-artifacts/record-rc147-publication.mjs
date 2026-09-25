import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const root = 'C:/Users/datoo/.dsh/chatroom-server/profiles/web/'
const before = await readFile(root + 'cordis.patch.rc147-prepublish.bak', 'utf8')
const after = await readFile(root + 'cordis.patch.yml', 'utf8')
const oldPath = '/chatroom-1.5.0-codex.rc1.42/dist/index.js'
const newPath = '/chatroom-1.5.0-codex.rc1.47/dist/index.js'
assert.equal(before.split(oldPath).length, 2)
assert.equal(after.replace(newPath, oldPath), before, 'Only the selected release path may change')
const sha = text => createHash('sha256').update(text).digest('hex')
const service = execFileSync('C:/Program Files/Servy/servy-cli.exe', ['status', '--name', 'dsh-chatroom'], { encoding: 'utf8' }).trim()
assert.match(service, /Running/u)
const listeners = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command', 'Get-NetTCPConnection -LocalPort 3181,3185 -State Listen | Select-Object LocalAddress,LocalPort,OwningProcess | ConvertTo-Json -Compress'], { encoding: 'utf8' }))
assert.equal(listeners.length, 2)
assert.equal(listeners.find(x => x.LocalPort === 3181)?.OwningProcess, 45580)
assert.equal(listeners.find(x => x.LocalPort === 3185)?.OwningProcess, 42372)
const result = {
  version: '1.5.0-codex.rc1.47', at: new Date().toISOString(), deployed: true,
  authorization: 'User explicitly requested publication of the staged RC147 candidate',
  overlay: { beforeSha256: sha(before), afterSha256: sha(after), onlyReleasePathChanged: true, rollback: root + 'cordis.patch.rc147-prepublish.bak' },
  phases: [
    { at: '2026-09-12T11:31:49.286Z', event: 'runtime.stop', pid: 45580, source: 'plugin diagnostics journal' },
    { at: '2026-09-12T11:31:49.366Z', event: 'old plugin disposed', healthStatus: 404 },
    { at: '2026-09-12T11:32:21.194Z', event: 'runtime.start', pid: 45580, source: 'plugin diagnostics journal' },
    { at: '2026-09-12T11:32:24.429Z', event: 'initialization still pending', healthStatus: 503, artifact: 'RC147-aggregate-publishinitial.json' },
    { at: '2026-09-12T11:32:54.839Z', event: 'ready', healthStatus: 200, diagnosticsHealthy: true, dropped: 0 }
  ],
  service, listeners, hostAndBridgeNotRestarted: true,
  failuresRetained: {
    firstPublic: 'RC147-public-browser.json',
    firstPublicError: 'anonymous gallery read must be denied: 502 !== 401',
    firstHarnessCleanup: 'Receipt saved false but Node PID 60796 and owned headless browser remained. Only this verified test process tree was terminated; first run is not a natural-exit pass.',
    iab: 'RC147-IAB-live-published.json',
    diagnosticCorrection: 'Ad hoc Node HTTPS checks initially omitted NODE_USE_ENV_PROXY and returned ECONNRESET. They are not evidence of production downtime. With the existing environment proxy honored, local/origin/public anonymous gallery reads returned 401 at 11:41:07Z.',
    attribution: 'A bridge request hit its 30-second header timeout at 11:34:50Z, but its sanitized record lacks a route and cannot be conclusively matched to the anonymous 502. Do not claim the first failure root cause is fixed.'
  },
  boundaries: ['No DSH core, account, credential, sandbox or other-plugin edits', 'No Git commit, push, npm publication or new paid generation', 'Original IAB was not refreshed; its current rendering remains unverified', 'Existing native heartbeat pause state was preserved']
}
await writeFile(new URL('RC147-PUBLICATION.json', import.meta.url), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify({ deployed: true, version: result.version, onlyReleasePathChanged: true, hostAndBridgeNotRestarted: true, at: result.at }))
