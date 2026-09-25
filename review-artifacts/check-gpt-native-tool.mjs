import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const base = 'http://127.0.0.1:3181'
const prefix = '/plugins/deepseek-harness-chatroom/api'
const secrets = JSON.parse(await readFile('C:/Users/datoo/.dsh/service/chatroom-secrets.json', 'utf8'))
let cookie = ''
async function request(path, body) {
  const r = await fetch(base + prefix + path, { method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base, ...(cookie ? { Cookie: cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20000) })
  if (r.headers.getSetCookie().length) cookie = r.headers.getSetCookie().map(v => v.split(';')[0]).join('; ')
  const result = await r.json().catch(() => ({}))
  assert.ok(r.ok, `${path}: ${r.status} ${result.error ?? ''}`)
  return result
}
await request('/auth/login', { username: secrets.testUsername, password: secrets.testPassword })
const marker = `SCHEMA-${Date.now()}`
const { room } = await request('/rooms', { title: `工具兼容验收 ${marker}` })
const result = await request('/rooms/agents', { roomId: room.id, action: 'create', name: '工具验收', role: '只读工具兼容验收',
  instructions: '只执行当前用户指定的一次 pwd，不写文件、不提权、不联网、不委派。调用 pwsh 时省略 sandbox_permissions 和 justification；它们是升级权限时才填的可选字段。',
  provider: 'oc-gpt6-low', model: 'gpt-6-astra', reasoningEffort: 'low', enabled: true })
const profile = result.profiles.find(p => p.name === '工具验收')
console.log(JSON.stringify({ roomId: room.id, profileId: profile.id, marker }))
const abort = new AbortController()
const timer = setTimeout(() => abort.abort(new Error('Native tool acceptance timed out')), 120000)
try {
  const r = await fetch(base + prefix + '/notifications', { headers: { Cookie: cookie, Origin: base }, signal: abort.signal })
  assert.equal(r.status, 200)
  await request('/prompt', { roomId: room.id, mode: 'queue', requestId: marker,
    content: [{ type: 'text', text: `@工具验收 这是已授权的只读诊断。请实际调用一次 pwsh 执行 pwd，省略 sandbox_permissions 和 justification，不要提升权限；然后回复 ${marker} 和命令实际结果。不要只复述预期目录。` }] })
  let buffer = ''
  outer: for await (const chunk of r.body.pipeThrough(new TextDecoderStream())) {
    buffer += chunk
    let boundary
    while ((boundary = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2)
      const line = block.split('\n').find(l => l.startsWith('data: '))
      if (!line) continue
      const event = JSON.parse(line.slice(6))
      const note = event.notification
      if (note?.roomId !== room.id || note.role !== 'ai') continue
      console.log(JSON.stringify({ reply: note.text }))
      if (note.text.includes(marker)) break outer
    }
  }
} finally {
  clearTimeout(timer); abort.abort()
  await request('/rooms/agents', { roomId: room.id, profileId: profile.id, action: 'cancel' })
  await request('/auth/logout', {})
}
