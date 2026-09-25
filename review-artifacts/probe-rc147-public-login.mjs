import { readFile, writeFile } from 'node:fs/promises'
const secrets = JSON.parse((await readFile('C:/Users/datoo/.dsh/service/chatroom-secrets.json', 'utf8')).replace(/^\uFEFF/u, ''))
const base = 'https://talk.opcvip.net'
const started = Date.now()
let result
try {
  const response = await fetch(base + '/plugins/deepseek-harness-chatroom/api/auth/login', {
    method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: secrets.adminUsername, password: secrets.adminPassword }),
    signal: AbortSignal.timeout(20_000),
  })
  const headersMs = Date.now() - started
  const session = await response.json()
  result = { at: new Date().toISOString(), status: response.status, headersMs, elapsedMs: Date.now() - started, role: session.auth?.account?.role, passed: response.status === 200 && session.auth?.account?.role === 'super-admin', configuredEnvironmentProxy: process.env.NODE_USE_ENV_PROXY === '1', boundary: 'Existing acceptance account; no credentials, cookie or room content saved; no message or paid generation' }
} catch (error) { result = { at: new Date().toISOString(), passed: false, elapsedMs: Date.now() - started, error: error.cause?.code ?? error.name } }
await writeFile(new URL('RC147-public-login-fetch.json', import.meta.url), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify(result))
if (!result.passed) process.exitCode = 1
