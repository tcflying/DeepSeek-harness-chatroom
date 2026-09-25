import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
const base = 'https://talk.opcvip.net'
const api = '/plugins/deepseek-harness-chatroom/api'
const secret = JSON.parse((await readFile('C:/Users/datoo/.dsh/service/chatroom-secrets.json', 'utf8')).replace(/^\uFEFF/u, ''))
const proof = { at: new Date().toISOString(), scope: 'Existing member login and fixed authorized acceptance room. No messages, model calls, settings writes, or private content in output.', passed: false }
try {
  const login = await fetch(base + api + '/auth/login', { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000), headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ username: secret.testUsername, password: secret.testPassword }) })
  assert.equal(login.status, 200)
  const session = await login.json()
  assert.equal(session.auth.account.role, 'member')
  const target = session.rooms.find(r => r.title === '权限与进展验收 20260912')
  assert.ok(target?.sessionId)
  const cookie = login.headers.getSetCookie().map(h => h.split(';', 1)[0]).join('; ')
  assert.ok(cookie)
  const post = async (path, body) => {
    const response = await fetch(base + path, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(35000), headers: { Origin: base, Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    assert.equal(response.status, 200)
    return response.json()
  }
  const list = await post('/api/session/list', { type: 'client-request', rpcId: randomUUID(), method: 'session/list', payload: { args: { _request: {} } } })
  assert.equal(list.result?.ok, true)
  const nativeTarget = list.result.value.items.find(s => s.sessionId === target.sessionId)
  const selected = await post(api + '/rooms/select', { roomId: target.id })
  proof.readbacks = { role: 'member', targetInAuthorizedRooms: true, nativeItemCount: list.result.value.items.length, targetInNativeCatalogue: nativeTarget !== undefined, nativeBlank: nativeTarget?.blank, selectedIdMatches: selected.room?.id === target.id, selectedSessionMatches: selected.room?.sessionId === target.sessionId }
  proof.passed = proof.readbacks.targetInNativeCatalogue && proof.readbacks.selectedIdMatches && proof.readbacks.selectedSessionMatches
} catch (error) { proof.error = { name: error.name, code: error.cause?.code ?? error.code } }
proof.completedAt = new Date().toISOString()
await writeFile(new URL('RC152-member-api-navigation.json', import.meta.url), JSON.stringify(proof, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify(proof))
if (!proof.passed) process.exitCode = 1
