import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { fileURLToPath } from 'node:url'

const log = createWriteStream(fileURLToPath(new URL('RC135-check-ci.log', import.meta.url)), { flags: 'wx' })
const child = spawn(process.execPath, ['C:/Program Files/nodejs/node_modules/corepack/dist/corepack.js', 'pnpm', 'run', 'check:ci'], {
  cwd: fileURLToPath(new URL('../', import.meta.url)), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
})
child.stdout.on('data', data => { process.stdout.write(data); log.write(data) })
child.stderr.on('data', data => { process.stderr.write(data); log.write(data) })
child.on('error', error => { log.end(String(error)); process.exitCode = 1 })
child.on('exit', code => { log.end(); process.exitCode = code ?? 1 })
