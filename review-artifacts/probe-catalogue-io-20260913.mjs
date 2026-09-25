/** Read-only filesystem/Host comparison. Never outputs session paths, bytes or auth. */
import { readdir, open, stat, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { randomUUID } from 'node:crypto'

const root = 'C:/Users/datoo/.dsh/chatroom-server/sessions'
const base = 'https://talk.opcvip.net'
const local = 'http://127.0.0.1:3181'
const endpoint = '/plugins/deepseek-harness-chatroom/api'
const deadline = AbortSignal.timeout(60_000)
const result = { at: new Date().toISOString(), boundary: 'Read-only bounded probe; reads at most 8192 compressed bytes per session without decoding or retaining contents. Independent process, not in-Host persistence timing. Existing admin authentication and one catalogue read only. No TUN, proxy, service or source changes.', io: {}, health: [], catalogue: null }
const timings = new Map()
const safeError = error => ({ kind: error?.name, code: /^(?:E[A-Z0-9_]+|UND_ERR_[A-Z_]+)$/.test(error?.cause?.code ?? error?.code ?? '') ? error?.cause?.code ?? error?.code : undefined })
async function measure(key, fn) {
  deadline.throwIfAborted()
  const started = performance.now()
  try { return await fn() }
  finally {
    const values = timings.get(key) ?? []
    values.push(performance.now() - started)
    timings.set(key, values)
  }
}
async function disk() {
  const started = performance.now()
  let files = 0
  for (const project of await measure('readdir', () => readdir(root, { withFileTypes: true }))) {
    if (!project.isDirectory()) continue
    const dir = join(root, project.name)
    for (const session of await measure('readdir', () => readdir(dir, { withFileTypes: true }))) {
      if (!session.isDirectory()) continue
      const sessionDir = join(dir, session.name)
      const entries = await measure('readdir', () => readdir(sessionDir, { withFileTypes: true }))
      const generations = entries.filter(entry => entry.isFile() && /^session(?:\.v\d+)?\.jsonl(?:\.zstd)?$/u.test(entry.name))
        .sort((a, b) => Number(b.name.match(/\.v(\d+)/u)?.[1] ?? 0) - Number(a.name.match(/\.v(\d+)/u)?.[1] ?? 0))
      if (!generations.length) continue
      if (++files > 1000) throw new Error('Bounded file count exceeded')
      const path = join(sessionDir, generations[0].name)
      const handle = await measure('open', () => open(path, 'r'))
      try { await measure('read-first-8192', () => handle.read(Buffer.alloc(8192), 0, 8192, 0)) }
      finally { await measure('close', () => handle.close()) }
      await measure('stat', () => stat(path))
    }
  }
  result.io = { files, totalMs: Math.round(performance.now() - started), stages: Object.fromEntries([...timings].map(([key, values]) => {
    values.sort((a, b) => a - b)
    return [key, { count: values.length, totalMs: Math.round(values.reduce((a, b) => a + b, 0)), p95Ms: Math.round(values[Math.floor((values.length - 1) * .95)]), maxMs: Math.round(values.at(-1)) }]
  })) }
  console.log(JSON.stringify({ io: result.io }))
}
async function health(stage) {
  const started = performance.now()
  try {
    const response = await fetch(local + endpoint + '/health', { signal: AbortSignal.timeout(8_000) })
    await response.arrayBuffer()
    result.health.push({ stage, status: response.status, elapsedMs: Math.round(performance.now() - started) })
  } catch (error) { result.health.push({ stage, error: safeError(error), elapsedMs: Math.round(performance.now() - started) }) }
}
try {
  await Promise.all([disk(), health('during-disk')])
  const secrets = JSON.parse((await readFile('C:/Users/datoo/.dsh/service/chatroom-secrets.json', 'utf8')).replace(/^\uFEFF/u, ''))
  const login = await fetch(base + endpoint + '/auth/login', {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15_000),
    headers: { Origin: base, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: secrets.adminUsername, password: secrets.adminPassword }),
  })
  const auth = await login.json()
  if (login.status !== 200 || auth.auth?.account?.role !== 'super-admin') throw new Error('Existing login failed')
  let cookie = login.headers.getSetCookie().map(value => value.split(';', 1)[0]).join('; ')
  if (!cookie) throw new Error('Missing auth cookie')
  const started = performance.now()
  const catalogue = (async () => {
    try {
      const response = await fetch(local + '/api/session/list', {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(35_000),
        headers: { Origin: local, Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'client-request', rpcId: randomUUID(), method: 'session/list', payload: { args: { _request: {} } } }),
      })
      const headersMs = Math.round(performance.now() - started)
      const body = await response.json()
      result.catalogue = { status: response.status, headersMs, totalMs: Math.round(performance.now() - started), rpcOk: body?.result?.ok === true, items: body?.result?.value?.items?.length }
    } finally { cookie = undefined }
  })()
  await Promise.all([catalogue, health('during-catalogue')])
} catch (error) { result.error = safeError(error) }
result.completedAt = new Date().toISOString()
result.observationComplete = result.io.files > 0 && result.catalogue?.rpcOk === true && !result.error
// This is evidence, not acceptance of the intermittent-latency fix.
result.latencyFixed = false
await writeFile(new URL('CATALOGUE-IO-20260913-r1.json', import.meta.url), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify(result, null, 2))
if (!result.observationComplete) process.exitCode = 1
