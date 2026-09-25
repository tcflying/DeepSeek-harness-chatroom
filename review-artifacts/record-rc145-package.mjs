import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
const version = process.env.RC_VERSION ?? '1.5.0-codex.rc1.45'
const revision = /^1\.5\.0-codex\.rc1\.(\d+)$/u.exec(version)?.[1]
assert.ok(revision, 'invalid candidate version')
const hash = data => createHash('sha256').update(data).digest('hex')
const root = new URL('../', import.meta.url)
const homes = ['C:/Users/datoo/.dsh/chatroom-next-test', 'C:/Users/datoo/.dsh/chatroom-server']
const tarball = `${homes[0]}/packs/deepseek-harness-chatroom-${version}.tgz`
const receipt = { version, at: new Date().toISOString(), tarballSha256: hash(await readFile(tarball)), bundles: {}, immutable: [], passed: false }
const members = execFileSync('tar', ['-tf', tarball], { encoding: 'utf8', windowsHide: true }).trim().split(/\r?\n/u)
assert.ok(members.length > 0)
for (const name of members) {
  assert.match(name, /^package\/(?:dist\/[A-Za-z0-9_.\/-]+|(?:package\.json|cordis\.patch\.yml|README(?:\.zh)?\.md|LICENSE|NOTICE\.md))$/u)
  assert.ok(!name.split('/').includes('..'), 'unsafe package member')
}
receipt.packageFileCount = members.length
receipt.packageBoundary = 'Only dist, manifest, public patch, readmes and licenses; no review artifacts, runtime config or credentials'
for (const file of ['dist/index.js', 'dist/client.js', 'dist/index.js.map', 'dist/client.js.map']) {
  receipt.bundles[file] = hash(await readFile(new URL(file, root)))
}
for (const home of homes) {
  const release = `${home}/profiles/web/plugin-releases/chatroom-${version}`
  const manifest = JSON.parse(await readFile(`${release}/package.json`, 'utf8'))
  assert.equal(manifest.version, version)
  for (const [file, expected] of Object.entries(receipt.bundles)) {
    assert.equal(hash(await readFile(`${release}/${file}`)), expected, `${release}/${file}`)
  }
  receipt.immutable.push({ release, sameBundles: true })
}
receipt.passed = true
await writeFile(new URL(`RC1${revision}-package-stage.json`, import.meta.url), `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx' })
console.log(JSON.stringify(receipt, null, 2))
