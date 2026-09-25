import { spawn } from 'node:child_process'
import { createWriteStream, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'

// The runner owns no timeout. Let the actual check:ci process complete and
// preserve a distinct receipt for a later natural retry if one is needed.
const logName = process.argv[2] ?? 'RC144-check-ci.log'
if (!/^RC144-check-ci(?:-r\d+)?\.log$/u.test(logName)) throw new Error('Invalid CI receipt name')
const log = createWriteStream(fileURLToPath(new URL(logName, import.meta.url)), { flags: 'wx' })
const root = fileURLToPath(new URL('../', import.meta.url))
const sha256File = path => createHash('sha256').update(readFileSync(path)).digest('hex')
const sourceFiles = [
  'src/client/ChatroomAccountPanels.tsx',
  'src/client/responsive-styles.ts',
  'src/client/styles.ts',
  'src/client/runtime-diagnostics.ts',
  'src/diagnostics.ts',
  'src/http.ts',
  'src/runtime-failure-evidence.ts',
]
const exitReceiptName = logName.replace(/\.log$/u, '.exit.json')
const snapshot = () => ({
  packageSha256: sha256File(`${root}package.json`),
  sourceSha256: Object.fromEntries(sourceFiles.map(file => [file, sha256File(`${root}${file}`)])),
})
// Capture the exact candidate before the test process begins.  The close
// receipt records whether that candidate remained unchanged while CI ran.
const started = snapshot()
const child = spawn(process.execPath, ['C:/Program Files/nodejs/node_modules/corepack/dist/corepack.js', 'pnpm', 'run', 'check:ci'], {
  cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
})
child.stdout.on('data', data => { process.stdout.write(data); log.write(data) })
child.stderr.on('data', data => { process.stderr.write(data); log.write(data) })
let spawnError
child.on('error', error => { spawnError = error; log.write(`${error}\n`) })
child.on('close', async (code, signal) => {
  const exitCode = spawnError ? 1 : (code ?? 1)
  log.end()
  await once(log, 'close')
  try {
    // This receipt is written only after the child closes naturally.  It hashes
    // candidate source paths and package metadata, never credentials or config.
    const completed = snapshot()
    const sameSource = sourceFiles.every(file => started.sourceSha256[file] === completed.sourceSha256[file])
    const samePackage = started.packageSha256 === completed.packageSha256
    writeFileSync(fileURLToPath(new URL(exitReceiptName, import.meta.url)), `${JSON.stringify({
      log: logName,
      exitCode,
      ...(signal ? { signal } : {}),
      closedAt: new Date().toISOString(),
      packageSha256: started.packageSha256,
      sourceSha256: started.sourceSha256,
      completedPackageSha256: completed.packageSha256,
      completedSourceSha256: completed.sourceSha256,
      samePackage,
      sameSource,
    }, null, 2)}\n`, { flag: 'wx' })
  } catch (error) {
    process.stderr.write(`Unable to write ${exitReceiptName}: ${error}\n`)
    process.exitCode = 1
    return
  }
  process.exitCode = exitCode
})
