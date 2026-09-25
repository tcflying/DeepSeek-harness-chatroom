// Bounded read-only transport comparison. Never writes rooms or prints credentials/content.
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
const label = process.argv[2]
assert.match(label ?? '', /^(before|after)-[a-z0-9]+$/u)
const api = '/plugins/deepseek-harness-chatroom/api'
const publicBase = 'https://talk.opcvip.net'
const secret = JSON.parse((await readFile('C:/Users/datoo/.dsh/service/chatroom-secrets.json', 'utf8')).replace(/^\uFEFF/u, ''))
const result = { at: new Date().toISOString(), label, boundary: 'Existing admin login; two read-only catalogues and health requests; no UI, model call, session mutation or network configuration change.', checks: [], passed: false }
const safeError = e => ({ kind: e?.name, code: /^(?:E[A-Z0-9_]+|UND_ERR_[A-Z_]+)$/.test(e?.cause?.code ?? e?.code ?? '') ? e?.cause?.code ?? e?.code : undefined })
try {
  const login = await fetch(publicBase + api + '/auth/login', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000), headers: { Origin: publicBase, 'Content-Type': 'application/json' }, body: JSON.stringify({ username: secret.adminUsername, password: secret.adminPassword }) })
  assert.equal(login.status, 200)
  assert.equal((await login.json()).auth?.account?.role, 'super-admin')
  const cookie = login.headers.getSetCookie().map(v => v.split(';', 1)[0]).join('; ')
  assert.ok(cookie)
  for (const base of ['http://127.0.0.1:3181', publicBase]) {
    const started = Date.now()
    const row = { transport: base.startsWith('http:') ? 'local' : 'public', at: new Date().toISOString(), health: null, catalogue: null }
    await Promise.all([
      (async () => {
        try {
          const response = await fetch(base + api + '/health', { signal: AbortSignal.timeout(8000) })
          const body = await response.json()
          row.health = { status: response.status, elapsedMs: Date.now() - started, ready: body.ready, diagnostics: body.diagnostics }
        } catch (e) { row.health = { error: safeError(e) } }
      })(),
      (async () => {
        try {
          const response = await fetch(base + '/api/session/list', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(35000), headers: { Origin: base, Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'client-request', rpcId: randomUUID(), method: 'session/list', payload: { args: { _request: {} } } }) })
          const headersMs = Date.now() - started
          const body = await response.json()
          row.catalogue = { status: response.status, headersMs, totalMs: Date.now() - started, rpcOk: body?.result?.ok === true, items: body?.result?.value?.items?.length }
        } catch (e) { row.catalogue = { error: safeError(e), totalMs: Date.now() - started } }
      })(),
    ])
    result.checks.push(row)
    console.log(JSON.stringify(row))
  }
  result.passed = result.checks.every(r => r.health?.ready === true && r.catalogue?.rpcOk === true)
} catch (e) { result.error = safeError(e) }
result.completedAt = new Date().toISOString()
await writeFile(new URL(`RC151-catalogue-${label}.json`, import.meta.url), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
if (!result.passed) process.exitCode = 1
