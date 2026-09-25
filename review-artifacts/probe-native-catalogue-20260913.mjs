/** Bounded, read-only production catalogue probe. No browser, room mutation or paid request. */
import { readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

const base = 'https://talk.opcvip.net'
const secrets = JSON.parse((await readFile('C:/Users/datoo/.dsh/service/chatroom-secrets.json', 'utf8')).replace(/^\uFEFF/u, ''))
const journal = 'C:/Users/datoo/.dsh/chatroom-server/chatroom/diagnostics/events.jsonl'
const result = { at: new Date().toISOString(), probes: [], journal: [], boundary: 'Existing admin login; catalogue reads only; no credentials, cookies, session ids, titles or content retained. Local and bridge calls target the same service, not another origin. No IAB, TUN, configuration or service changes.' }
let cookie
const safeError = error => ({ kind: error?.name, code: /^(?:E[A-Z0-9_]+|UND_ERR_[A-Z_]+)$/.test(error?.cause?.code ?? '') ? error.cause.code : undefined })
try {
  const started = Date.now()
  const login = await fetch(base + '/plugins/deepseek-harness-chatroom/api/auth/login', {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20_000),
    headers: { Origin: base, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: secrets.adminUsername, password: secrets.adminPassword }),
  })
  const session = await login.json()
  result.login = { status: login.status, elapsedMs: Date.now() - started, role: session.auth?.account?.role }
  if (login.status !== 200 || result.login.role !== 'super-admin') throw new Error('Existing admin login failed')
  cookie = login.headers.getSetCookie().map(value => value.split(';', 1)[0]).join('; ')
  if (!cookie) throw new Error('No login cookie')
  for (const [name, origin] of [['local', 'http://127.0.0.1:3181'], ['bridge', 'http://127.0.0.1:3185'], ['public', base]]) {
    const started = Date.now()
    let row
    try {
      const response = await fetch(origin + '/api/session/list', {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(35_000),
        headers: { Origin: name === 'local' ? origin : base, Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'client-request', rpcId: randomUUID(), method: 'session/list', payload: { args: { _request: {} } } }),
      })
      const headersMs = Date.now() - started
      const raw = await response.text()
      let body
      try { body = JSON.parse(raw) } catch { /* only retain structural failure, never body */ }
      row = { name, status: response.status, headersMs, elapsedMs: Date.now() - started,
        rpcOk: body?.result?.ok === true, items: Array.isArray(body?.result?.value?.items) ? body.result.value.items.length : undefined }
    } catch (error) { row = { name, elapsedMs: Date.now() - started, error: safeError(error) } }
    result.probes.push(row)
    console.log(JSON.stringify(row))
  }
} catch (error) { result.error = safeError(error) }
finally { cookie = undefined }
const content = await readFile(journal, 'utf8')
result.journal = content.split('\n').flatMap(line => {
  try {
    const row = JSON.parse(line)
    return row.at >= result.at && ['native.session-list.complete', 'native.session-list.timeout'].includes(row.event)
      ? [{ at: row.at, pid: row.pid, event: row.event, sessionList: row.sessionList }] : []
  } catch { return [] }
})
result.completedAt = new Date().toISOString()
result.passed = result.probes.length === 3 && result.probes.every(row => row.status === 200 && row.rpcOk)
await writeFile(new URL('NATIVE-CATALOGUE-20260913-r2.json', import.meta.url), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify(result, null, 2))
if (!result.passed) process.exitCode = 1
