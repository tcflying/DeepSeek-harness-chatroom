import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const hash = async path => createHash('sha256').update(await readFile(path)).digest('hex')
const repo = 'G:/codex-project/dsh-chatroom-next'
const profile = 'C:/Users/datoo/.dsh/chatroom-server/profiles/web'
const plugin = profile + '/node_modules/deepseek-harness-chatroom'
const version = process.argv[2] ?? '1.5.0-codex.rc1.3'
assert.ok(['1.5.0-codex.rc1.3', '1.5.0-codex.rc1.4', '1.5.0-codex.rc1.5', '1.5.0-codex.rc1.6', '1.5.0-codex.rc1.7', '1.5.0-codex.rc1.8', '1.5.0-codex.rc1.9', '1.5.0-codex.rc1.10', '1.5.0-codex.rc1.11', '1.5.0-codex.rc1.12', '1.5.0-codex.rc1.13'].includes(version))
const packed = `C:/Users/datoo/.dsh/plugins-src/deepseek-harness-chatroom-${version}.tgz`
const expected = JSON.parse(await readFile(repo + '/package.json', 'utf8'))
const installed = JSON.parse(await readFile(plugin + '/package.json', 'utf8'))
assert.equal(installed.version, version)
assert.deepEqual(installed.dependencies, expected.dependencies)
assert.deepEqual(installed.peerDependencies, expected.peerDependencies)
const manifest = JSON.parse(await readFile(profile + '/package.json', 'utf8'))
assert.equal(manifest.dependencies['deepseek-harness-chatroom'].replaceAll('\\', '/'), 'file:' + packed)
assert.ok(!(await readFile(profile + '/pnpm-lock.yaml', 'utf8')).includes('chatroom-next-test'))
for (const file of ['index.js', 'client.js']) {
  const digest = await hash(plugin + '/dist/' + file)
  assert.equal(digest, await hash(repo + '/dist/' + file))
  console.log(JSON.stringify({ file, sha256: digest, identical: true }))
}
const digest = await hash(packed)
if (version === '1.5.0-codex.rc1.3') assert.equal(digest, await hash('C:/Users/datoo/.dsh/chatroom-next-test/packs/deepseek-harness-chatroom-1.5.0-codex.rc1.3.tgz'))
else {
  assert.equal(installed.license, 'SEE LICENSE IN NOTICE.md')
  assert.match(await readFile(plugin + '/NOTICE.md', 'utf8'), /Tencent/)
}
console.log(JSON.stringify({ installed: installed.version, durablePackage: packed, sha256: digest, dependenciesUnchanged: true }))
const health = await fetch('http://127.0.0.1:3181/plugins/deepseek-harness-chatroom/api/health', { signal: AbortSignal.timeout(10000) })
assert.equal(health.status, 200)
assert.deepEqual(await health.json(), { ready: true })
console.log(JSON.stringify({ liveHealth: 'passed' }))
