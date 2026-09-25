import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const version = '1.5.0-codex.rc1.50'
const home = 'C:/Users/datoo/.dsh/chatroom-server/'
const start = process.argv[2]
assert.match(start ?? '', /^2026-09-\d\dT\d\d:\d\d:\d\d/u)
const rollback = home + 'profiles/web/cordis.patch.rc150-prepublish.bak'
const before = await readFile(rollback, 'utf8')
const after = await readFile(home + 'profiles/web/cordis.patch.yml', 'utf8')
const oldPath = '/chatroom-1.5.0-codex.rc1.49/dist/index.js'
const newPath = `/chatroom-${version}/dist/index.js`
assert.equal(before.split(oldPath).length, 2)
assert.equal(after.split(newPath).length, 2)
assert.equal(after.replace(newPath, oldPath), before)
const sha256 = value => createHash('sha256').update(value).digest('hex')
const normalize = bytes => bytes.toString('utf8').replace(/\r\n/gu, '\n')
  .replace(/(?:\n;\n|\n)\/\/# sourceMappingURL=[^\r\n]*[\r\n]*$/u, '')
const stage = JSON.parse(await readFile(new URL('RC150-package-stage.json', import.meta.url), 'utf8'))
const ci = JSON.parse(await readFile(new URL('RC150-check-ci.exit.json', import.meta.url), 'utf8'))
assert.equal(stage.passed, true)
// Preserve the failed full-CI result. For this two-layer-only repair the
// direct real-browser regression supplies the missing functional proof;
// it does not turn an aborted Vitest bootstrap or cleanup into a CI pass.
const direct = JSON.parse(await readFile(new URL('RC150-mobile-layers-direct.json', import.meta.url), 'utf8'))
const log = await readFile(new URL('RC150-check-ci.log', import.meta.url), 'utf8')
assert.match(log, /497 passed \(497\)/u)
assert.match(log, /Build complete/u)
assert.equal(direct.functionalPassed, true)
assert.equal(direct.rows.length, 4)
assert.equal(direct.sourceSha256, sha256(await readFile(new URL('../src/client/qq2007-styles.ts', import.meta.url))))
if (ci.exitCode !== 0) {
  assert.match(log, /page\.goto: net::ERR_ABORTED/u)
  assert.match(log, /Tests\s+no tests/u)
}
assert.equal(ci.sameSource, true)
const candidate = await readFile(home + `profiles/web/plugin-releases/chatroom-${version}/dist/client.js`)
assert.equal(sha256(candidate), stage.bundles['dist/client.js'])
const service = execFileSync('C:/Program Files/Servy/servy-cli.exe', ['status', '--name', 'dsh-chatroom'], { encoding: 'utf8', windowsHide: true }).trim()
assert.match(service, /Running/u)
const listeners = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command', 'Get-NetTCPConnection -LocalPort 3181,3185 -State Listen | Select-Object LocalPort,OwningProcess | ConvertTo-Json -Compress'], { encoding: 'utf8', windowsHide: true }))
assert.equal(listeners.find(row => row.LocalPort === 3181)?.OwningProcess, 45580)
assert.equal(listeners.find(row => row.LocalPort === 3185)?.OwningProcess, 42372)
const phases = (await readFile(home + 'chatroom/diagnostics/events.jsonl', 'utf8')).trim().split('\n').map(JSON.parse)
  .filter(row => row.at >= start && ['runtime.start', 'runtime.stop'].includes(row.event))
assert.deepEqual(phases.map(row => row.event), ['runtime.stop', 'runtime.start'])
const surfaces = []
for (const base of ['http://127.0.0.1:3181', 'https://talk.opcvip.net']) {
  const response = await fetch(base + '/plugins/deepseek-harness-chatroom/api/health', { signal: AbortSignal.timeout(10_000) })
  assert.equal(response.status, 200)
  const health = await response.json()
  assert.equal(health.ready, true)
  assert.deepEqual(health.diagnostics, { enabled: true, healthy: true, dropped: 0 })
  const shell = await fetch(base + '/', { signal: AbortSignal.timeout(10_000) })
  assert.equal(shell.status, 200)
  const match = /"id":"deepseek-harness-chatroom","url":"([^"]+)"/u.exec(await shell.text())
  assert.ok(match)
  const responseAsset = await fetch(new URL(match[1], base), { signal: AbortSignal.timeout(15_000) })
  assert.equal(responseAsset.status, 200)
  const asset = Buffer.from(await responseAsset.arrayBuffer())
  assert.ok(asset.indexOf(candidate) >= 0 || normalize(asset) === normalize(candidate))
  surfaces.push({ base, at: new Date().toISOString(), health, fullClientPayloadEqual: true,
    servedSha256: sha256(asset), candidateSha256: sha256(candidate), normalization: 'terminal Host source-map wrapper and CRLF only' })
}
const result = { version, at: new Date().toISOString(), deployed: true, service, listeners, phases, surfaces,
  acceptance: { fullCiPassed: ci.exitCode === 0, directFunctionalPassed: direct.functionalPassed, browserCleanupPassed: direct.passed,
    releaseDecision: 'Scoped mobile z-index-only repair; current typecheck/unit497/build plus4 direct-browser regression cases; retained Vitest bootstrap and driver teardown failures are not passes. Live deployed UI is checked separately.' },
  hostAndBridgeNotRestarted: true, overlay: { rollback, onlyReleasePathChanged: true, beforeSha256: sha256(before), afterSha256: sha256(after) },
  boundaries: ['Plugin-only mobile layers; no core, other-plugin file, permissions, credentials or network change',
    'CI/package/publication are not a full public/IAB acceptance claim; individual failed receipts remain retained'] }
await writeFile(new URL('RC150-PUBLICATION.json', import.meta.url), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify(result))
