import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const roomId = process.argv[2]
assert.match(roomId ?? '', /^[0-9a-f-]{36}$/u)
const base = 'http://127.0.0.1:3181'
const prefix = '/plugins/deepseek-harness-chatroom/api'
const secrets = JSON.parse(await readFile('C:/Users/datoo/.dsh/service/chatroom-secrets.json', 'utf8'))
let cookie = ''
async function request(path, body) {
  const response = await fetch(base + prefix + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base, ...(cookie ? { Cookie: cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000),
  })
  if (response.headers.getSetCookie().length) cookie = response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
  const text = await response.text()
  const value = text ? JSON.parse(text) : {}
  assert.ok(response.ok, `Room management HTTP ${response.status}`)
  return value
}
await request('/auth/login', { username: secrets.testUsername, password: secrets.testPassword })
try {
  const view = await request('/rooms/manage?roomId=' + roomId)
  const matches = view.candidates?.filter(candidate => candidate.displayName === '本机管理员') ?? []
  assert.equal(matches.length, 1, 'Expected one explicitly identified browser user candidate')
  const candidate = matches[0]
  const id = candidate.participantId ?? candidate.id
  assert.equal(typeof id, 'string')
  await request('/rooms/manage', { roomId, action: 'add-members', participantIds: [id] })
  console.log(JSON.stringify({ roomId, browserUserAdded: candidate.displayName }))
} finally {
  await request('/auth/logout', {})
}
