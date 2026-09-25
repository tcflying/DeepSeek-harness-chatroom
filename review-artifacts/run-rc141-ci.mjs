import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { fileURLToPath } from 'node:url'

const logName = process.argv[2] ?? 'RC141-check-ci.log'
if (!/^RC141-check-ci(?:-r\d+)?\.log$/u.test(logName)) throw new Error('Invalid CI receipt name')
const log = createWriteStream(fileURLToPath(new URL(logName, import.meta.url)), { flags: 'wx' })
const child = spawn(process.execPath, ['C:/Program Files/nodejs/node_modules/corepack/dist/corepack.js', 'pnpm', 'run', 'check:ci'], {
  cwd: fileURLToPath(new URL('../', import.meta.url)), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
})
child.stdout.on('data', data => { process.stdout.write(data); log.write(data) })
child.stderr.on('data', data => { process.stderr.write(data); log.write(data) })
child.on('error', error => { log.end(String(error)); process.exitCode = 1 })
child.on('exit', code => { log.end(); process.exitCode = code ?? 1 })
