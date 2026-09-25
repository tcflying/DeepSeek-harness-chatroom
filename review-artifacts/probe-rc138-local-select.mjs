import { readFile, writeFile } from 'node:fs/promises'

// One bounded, authenticated loopback selection diagnostic. It intentionally
// never logs credentials, cookies, room IDs/titles, or response bodies.
const base = process.env.DSH_CHATROOM_LOCAL_ORIGIN ?? 'http://127.0.0.1:3181'
if (base !== 'http://127.0.0.1:3181') throw new Error('loopback origin required')
const prefix = '/plugins/deepseek-harness-chatroom/api'
const output = new URL('./RC138-local-select-probe.json', import.meta.url)
const failureKind = error => error?.name === 'TimeoutError' ? 'timeout' : error?.name === 'AbortError' ? 'aborted' : 'network-error'
const result = { version: '1.5.0-codex.rc1.38', mode: 'one-local-authenticated-select', at: new Date().toISOString(), passed: false }
let cookie = ''
try {
  const secrets = JSON.parse(await readFile('C:/Users/datoo/.dsh/service/chatroom-secrets.json', 'utf8'))
  const login = await fetch(base + prefix + '/auth/login', {
    method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: secrets.adminUsername, password: secrets.adminPassword }), signal: AbortSignal.timeout(10_000),
  })
  result.loginStatus = login.status
  if (!login.ok) throw new Error('login failed')
  cookie = login.headers.getSetCookie().map(value => value.split(';', 1)[0]).join('; ')
  const session = await login.json()
  const room = Array.isArray(session.rooms) ? session.rooms.find(item => item?.title === '全国可飞') : undefined
  result.targetPresent = room !== undefined
  if (room === undefined) throw new Error('target missing')
  const started = performance.now()
  try {
    const selected = await fetch(base + prefix + '/rooms/select', {
      method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ roomId: room.id }), signal: AbortSignal.timeout(15_000),
    })
    await selected.arrayBuffer()
    result.select = { outcome: 'completed', status: selected.status, elapsedMs: Math.round(performance.now() - started) }
    result.passed = selected.status === 200
  } catch (error) {
    result.select = { outcome: failureKind(error), elapsedMs: Math.round(performance.now() - started) }
  }
} catch (error) {
  result.failure = failureKind(error)
} finally {
  if (cookie !== '') await fetch(base + prefix + '/auth/logout', {
    method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json', Cookie: cookie }, body: '{}', signal: AbortSignal.timeout(5_000),
  }).catch(() => undefined)
  await writeFile(output, JSON.stringify(result, null, 2) + '\n', { mode: 0o600 })
}
console.log(JSON.stringify(result))
