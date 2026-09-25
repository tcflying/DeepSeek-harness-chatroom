import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const base = process.argv[2] ?? 'http://127.0.0.1:3186'
assert.ok(['http://127.0.0.1:3186', 'http://127.0.0.1:3181', 'http://192.168.50.239:3182', 'https://192.168.50.239:3183', 'https://talk.opcvip.net'].includes(base))
const prefix = '/plugins/deepseek-harness-chatroom/api'
const secrets = JSON.parse(await readFile('C:/Users/datoo/.dsh/service/chatroom-secrets.json', 'utf8'))
let cookie = ''
async function request(path, body) {
  const start = performance.now()
  const response = await fetch(base + prefix + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base, ...(cookie ? { Cookie: cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(25000),
  })
  if (response.ok && response.headers.getSetCookie().length) cookie = response.headers.getSetCookie().map(v => v.split(';')[0]).join('; ')
  const value = await response.json().catch(() => ({}))
  console.log(JSON.stringify({ base, path, status: response.status, elapsedMs: Math.round(performance.now() - start), ...(response.ok ? {} : { error: value.error }) }))
  assert.ok(response.ok, `${path}: HTTP ${response.status}`)
  return value
}
const guest = process.argv.includes('--guest') && base === 'http://127.0.0.1:3186'
if (guest) await request('/session', { displayName: '整合验收', avatarId: 'whale' })
else await request('/auth/login', { username: secrets.testUsername, password: secrets.testPassword })
const rooms = await request('/rooms')
console.log(JSON.stringify({ authenticated: true, roomCount: rooms.rooms?.length }))
const providers = await request('/auth/providers')
console.log(JSON.stringify({ registrationEnabled: providers.registrationEnabled, authenticated: providers.authenticated }))
if (process.argv.includes('--exercise')) {
  const marker = `RC13-${Date.now()}`
  const { room } = await request('/rooms', { title: `整合验收 ${marker}` })
  console.log(JSON.stringify({ acceptanceRoomId: room.id, marker }))
  const profiles = []
  for (const name of ['验收甲', '验收乙']) {
    const view = await request('/rooms/agents', { roomId: room.id, action: 'create', name, role: '消息投递验收',
      instructions: '不要调用任何工具。每次仅回复当前消息中的 RC13 标记和你的名字，不要回复此前消息。',
      provider: 'minimax-cn', model: 'MiniMax-M3', reasoningEffort: 'high', enabled: true })
    profiles.push(view.profiles.find(profile => profile.name === name))
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error('Live replies timed out after 150 seconds')), 150000)
  const replies = new Set()
  const started = performance.now()
  const events = await fetch(base + prefix + '/notifications', { headers: { Cookie: cookie, Origin: base }, signal: controller.signal })
  assert.equal(events.status, 200)
  const readReplies = (async () => {
    let buffer = ''
    for await (const chunk of events.body.pipeThrough(new TextDecoderStream())) {
      buffer += chunk
      let boundary
      while ((boundary = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2)
        const line = block.split('\n').find(line => line.startsWith('data: '))
        if (!line) continue
        const event = JSON.parse(line.slice(6))
        const note = event.notification
        if (note?.roomId !== room.id || note.role !== 'ai') continue
        for (const round of [1, 2]) {
          if (!note.text.includes(`${marker}-${round}`)) continue
          const key = `${note.displayName}:${round}`
          if (replies.has(key)) continue
          replies.add(key)
          console.log(JSON.stringify({ reply: key, text: note.text, elapsedMs: Math.round(performance.now() - started) }))
        }
        if (replies.size === 4) return
      }
    }
  })()
  // Observe the read immediately so a failing connection never becomes an unhandled rejection.
  readReplies.catch(() => undefined)
  try {
    for (const round of [1, 2]) await request('/prompt', { roomId: room.id, mode: 'queue', requestId: `${marker}-${round}`,
      content: [{ type: 'text', text: `@验收甲 @验收乙 请分别仅回复 ${marker}-${round} 和自己的名字。` }] })
    await readReplies
    assert.equal(replies.size, 4, 'Every named AI must project both accepted messages')
    const view = await request(`/rooms/agents?roomId=${encodeURIComponent(room.id)}`)
    console.log(JSON.stringify({ liveExercise: 'passed', replies: replies.size, profiles: view.profiles.map(p => ({ name: p.name, provider: p.provider, model: p.model, status: p.runtime.status })) }))
  } finally {
    clearTimeout(timer)
    controller.abort()
    for (const profile of profiles) if (profile) await request('/rooms/agents', { roomId: room.id, profileId: profile.id, action: 'cancel' }).catch(() => undefined)
  }
}
if (!guest) await request('/auth/logout', {})
