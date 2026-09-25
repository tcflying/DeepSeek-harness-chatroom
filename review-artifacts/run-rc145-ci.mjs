import { spawn } from 'node:child_process'
import { createWriteStream, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version
const revision = /^1\.5\.0-codex\.rc1\.(\d+)$/u.exec(version)?.[1]
if (!revision) throw new Error('Invalid candidate version')
const logName = process.argv[2] ?? `RC1${revision}-check-ci.log`
if (!new RegExp(`^RC1${revision}-check-ci(?:-r\\d+)?\\.log$`, 'u').test(logName)) throw new Error('Invalid receipt name')
const log = createWriteStream(new URL(logName, import.meta.url), { flags: 'wx' })
const files = dir => readdirSync(join(root, dir), { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? files(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`])
const watched = [...files('src'), ...files('tests'), ...files('scripts'), 'package.json', 'pnpm-lock.yaml', 'vitest.config.ts', 'vitest.browser.config.ts', 'tsdown.config.ts'].sort()
const sha256 = file => createHash('sha256').update(readFileSync(join(root, file))).digest('hex')
const snapshot = () => Object.fromEntries(watched.map(file => [file, sha256(file)]))
const startedAt = new Date().toISOString()
const before = snapshot()
const child = spawn(process.execPath, ['C:/Program Files/nodejs/node_modules/corepack/dist/corepack.js', 'pnpm', 'run', 'check:ci'], {
  cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
})
for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { process.stdout.write(data); log.write(data) })
let spawnError
child.on('error', error => { spawnError = error; log.write(`${error}\n`) })
child.on('close', async (code, signal) => {
  log.end()
  await once(log, 'close')
  const after = snapshot()
  const sameSource = watched.every(file => before[file] === after[file])
  const exitCode = spawnError ? 1 : (code ?? 1)
  writeFileSync(new URL(logName.replace(/\.log$/u, '.exit.json'), import.meta.url), `${JSON.stringify({
    version, log: logName, startedAt, closedAt: new Date().toISOString(),
    exitCode, ...(signal ? { signal } : {}), sameSource, before, after,
  }, null, 2)}\n`, { flag: 'wx' })
  process.exitCode = exitCode || (sameSource ? 0 : 1)
})
