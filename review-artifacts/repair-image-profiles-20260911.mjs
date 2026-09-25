import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { imageProfileInstructions } from './image-profile-instructions.mjs'
const base = 'http://127.0.0.1:3181'
const prefix = '/plugins/deepseek-harness-chatroom/api'
const roomId = '29f58452-d88b-4495-9aee-03028b49df15'
const ids = ['33358ae9-d5da-40fc-b6b5-b6d65ed1da7a', '99842070-a9a4-4f67-8e48-1aba422dfc17']
let cookie = ''
async function request(path, body) {
  const response = await fetch(base + prefix + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', Origin: base, ...(cookie ? { Cookie: cookie } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(25000) })
  assert.ok(response.ok, `${path}: HTTP ${response.status}`)
  if (response.headers.getSetCookie().length) cookie = response.headers.getSetCookie().map(v => v.split(';')[0]).join('; ')
  const text = await response.text()
  return text ? JSON.parse(text) : undefined
}
const secrets = JSON.parse(await readFile('C:/Users/datoo/.dsh/service/chatroom-secrets.json', 'utf8'))
await request('/auth/login', { username: secrets.testUsername, password: secrets.testPassword })
try {
  const overview = await request(`/rooms/agents?roomId=${roomId}`)
  assert.equal(overview.canManage, true)
  const targets = ids.map(id => { const p = overview.profiles.find(p => p.id === id); assert.ok(p); return p })
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'inspect', profiles: targets }))
  if (process.argv.includes('--apply')) {
    assert.ok(targets.every(p => ['idle', 'failed', 'cancelled'].includes(p.runtime?.status)), 'Do not change active AI profiles')
    await writeFile(new URL(`./image-profiles-before-${Date.now()}.json`, import.meta.url), JSON.stringify({ roomId, profiles: targets }, null, 2), { flag: 'wx' })
    for (const profile of targets) {
      const current = await request(`/rooms/agents?roomId=${roomId}`)
      assert.deepEqual(current.profiles.find(p => p.id === profile.id), profile, 'Profile changed concurrently')
      const input = Object.fromEntries(['name', 'role', 'provider', 'model', 'reasoningEffort', 'enabled'].filter(k => profile[k] !== undefined).map(k => [k, profile[k]]))
      await request('/rooms/agents', { roomId, profileId: profile.id, action: 'update', ...input, instructions: imageProfileInstructions })
    }
    const after = await request(`/rooms/agents?roomId=${roomId}`)
    for (const previous of targets) {
      const current = after.profiles.find(p => p.id === previous.id)
      assert.equal(current.instructions, imageProfileInstructions)
      for (const key of ['id', 'roomId', 'name', 'role', 'provider', 'model', 'reasoningEffort', 'enabled', 'createdAt']) assert.equal(current[key], previous[key], key)
    }
    console.log(JSON.stringify({ updated: ids, verified: 'instructions-only; identity and model route preserved' }))
  }
} finally { await request('/auth/logout', {}) }
