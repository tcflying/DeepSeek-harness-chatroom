import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
const [revision, previous, start, ciName] = process.argv.slice(2)
assert.match(revision ?? '', /^5[12]$/u)
assert.match(previous ?? '', /^5[01]$/u)
assert.match(start ?? '', /^2026-09-\d\dT\d\d:\d\d:\d\d/u)
assert.match(ciName ?? '', new RegExp(`^RC1${revision}-check-ci(?:-r\\d+)?\\.exit\\.json$`, 'u'))
const version = `1.5.0-codex.rc1.${revision}`, tag = `RC1${revision}`
const home = 'C:/Users/datoo/.dsh/chatroom-server/'
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const json = async path => JSON.parse((await readFile(path, 'utf8')).replace(/^\uFEFF/u, ''))
const artifact = name => new URL(name, import.meta.url)
const rollback = `${home}profiles/web/cordis.patch.rc1${revision}-prepublish.bak`
const before = await readFile(rollback, 'utf8'), after = await readFile(home + 'profiles/web/cordis.patch.yml', 'utf8')
const oldPath = `/chatroom-1.5.0-codex.rc1.${previous}/dist/index.js`, newPath = `/chatroom-${version}/dist/index.js`
assert.equal(after.split(newPath).length, 2)
assert.equal(after.replace(newPath, oldPath), before)
const stage = await json(artifact(`${tag}-package-stage.json`)), ci = await json(artifact(ciName))
assert.equal(stage.passed, true); assert.equal(ci.exitCode, 0); assert.equal(ci.sameSource, true)
for (const [path, sha] of Object.entries(ci.after)) assert.equal(hash(await readFile(new URL('../' + path, import.meta.url))), sha, path)
const candidate = await readFile(`${home}profiles/web/plugin-releases/chatroom-${version}/dist/client.js`)
assert.equal(hash(candidate), stage.bundles['dist/client.js'])
const normalize = bytes => bytes.toString('utf8').replace(/\r\n/gu, '\n').replace(/(?:\n;\n|\n)\/\/# sourceMappingURL=[^\r\n]*[\r\n]*$/u, '')
const surfaces = []
for (const base of ['http://127.0.0.1:3181', 'https://talk.opcvip.net']) {
  const healthResponse = await fetch(base + '/plugins/deepseek-harness-chatroom/api/health', { signal: AbortSignal.timeout(10000) })
  assert.equal(healthResponse.status, 200)
  const health = await healthResponse.json(); assert.equal(health.ready, true)
  assert.deepEqual(health.diagnostics, { enabled: true, healthy: true, dropped: 0 })
  const shell = await fetch(base + '/', { signal: AbortSignal.timeout(10000) })
  assert.equal(shell.status, 200)
  const match = /"id":"deepseek-harness-chatroom","url":"([^"]+)"/u.exec(await shell.text())
  assert.ok(match)
  const asset = await fetch(new URL(match[1], base), { signal: AbortSignal.timeout(15000) })
  assert.equal(asset.status, 200)
  const bytes = Buffer.from(await asset.arrayBuffer())
  assert.ok(bytes.indexOf(candidate) >= 0 || normalize(bytes) === normalize(candidate))
  surfaces.push({ base, health, exactClientPayload: true, servedSha256: hash(bytes) })
}
const service = execFileSync('C:/Program Files/Servy/servy-cli.exe', ['status', '--name', 'dsh-chatroom'], { encoding: 'utf8', windowsHide: true }).trim()
assert.match(service, /Running/u)
const listeners = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command', 'Get-NetTCPConnection -State Listen -LocalPort 3181,3185 | Select-Object LocalPort,OwningProcess | ConvertTo-Json -Compress'], { encoding: 'utf8', windowsHide: true }))
assert.equal(listeners.find(x => x.LocalPort === 3181)?.OwningProcess, 8584)
assert.equal(listeners.find(x => x.LocalPort === 3185)?.OwningProcess, 9188)
const events = (await readFile(home + 'chatroom/diagnostics/events.jsonl', 'utf8')).trim().split('\n').map(JSON.parse).filter(x => x.at >= start)
const phases = events.filter(x => ['runtime.stop', 'runtime.start'].includes(x.event))
assert.deepEqual(phases.map(x => x.event), ['runtime.stop', 'runtime.start'])
const catalogueStages = events.filter(x => x.event === 'native.session-list.complete').map(x => ({ at: x.at, ...x.sessionList, filterOnlyMs: x.sessionList.filterElapsedMs - x.sessionList.jsonElapsedMs }))
const result = { version, at: new Date().toISOString(), deployed: true, fullCiPassed: true, service, listeners, hostAndBridgeNotRestarted: true, overlay: { rollback, onlyReleasePathChanged: true, beforeSha256: hash(before), afterSha256: hash(after) }, surfaces, phases, catalogueStages, boundary: 'Publication and current transport evidence only. Individual failed public/IAB assertions and historical outage attribution remain unresolved.' }
await writeFile(artifact(`${tag}-PUBLICATION.json`), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify({ version, deployed: true, fullCiPassed: true, exactSurfaces: surfaces.length, hostAndBridgeNotRestarted: true, catalogueStages }))
