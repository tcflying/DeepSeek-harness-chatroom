import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { imageProfileInstructions } from './image-profile-instructions.mjs'
const base = process.argv[2] ?? 'http://127.0.0.1:3186'
assert.ok(['http://127.0.0.1:3186', 'http://127.0.0.1:3181'].includes(base))
const guest = base.endsWith(':3186')
const prefix = '/plugins/deepseek-harness-chatroom/api'
let cookie = ''
async function request(path, body) {
  const response = await fetch(base + prefix + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base, ...(cookie ? { Cookie: cookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(25000),
  })
  if (response.ok && response.headers.getSetCookie().length) cookie = response.headers.getSetCookie().map(v => v.split(';')[0]).join('; ')
  const value = await response.json()
  assert.ok(response.ok, `${path}: HTTP ${response.status} ${value.error ?? ''}`)
  return value
}
if (guest) await request('/session', { displayName: '生图验收', avatarId: 'whale' })
else {
  const secrets = JSON.parse(await readFile('C:/Users/datoo/.dsh/service/chatroom-secrets.json', 'utf8'))
  await request('/auth/login', { username: secrets.testUsername, password: secrets.testPassword })
}
const marker = `IMAGE-${Date.now()}`
const { room } = await request('/rooms', { title: `GPT 与 M3 生图验收 ${marker}` })
const profiles = []
for (const route of [{ name: 'GPT生图验收', provider: 'oc-gpt6-low', model: 'gpt-6-astra', reasoningEffort: 'low' }, { name: 'M3生图验收', provider: 'minimax-cn', model: 'MiniMax-M3', reasoningEffort: 'high' }]) {
  const result = await request('/rooms/agents', { roomId: room.id, action: 'create', ...route, role: '生图工具实测', instructions: imageProfileInstructions, enabled: true })
  profiles.push(result.profiles.find(p => p.name === route.name))
}
console.log(JSON.stringify({ base, marker, roomId: room.id, profiles: profiles.map(p => ({ id: p.id, name: p.name })) }))
const results = []
try {
  for (const [index, profile] of profiles.entries()) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(new Error('Image acceptance timed out')), 300000)
    const started = Date.now()
    try {
      const stream = await fetch(base + prefix + '/notifications', { headers: { Cookie: cookie, Origin: base }, signal: controller.signal })
      assert.equal(stream.status, 200)
      await request('/prompt', { roomId: room.id, mode: 'queue', requestId: `${marker}-${index}`, content: [{ type: 'text', text: `@${profile.name} 这是已授权的图片生成验收，请实际调用一次 chatroom_generate_image，生成${index === 0 ? '白色背景上的一个蓝色圆形' : '淡蓝背景上戴红围巾的可爱小企鹅'}。size=1024x1024，quality=low。成功后发回真实预览和下载链接，并带上 ${marker}-${index}；失败则报告实际错误，不重复尝试。` }] })
      let buffer = '', found
      outer: for await (const chunk of stream.body.pipeThrough(new TextDecoderStream())) {
        buffer += chunk
        let boundary
        while ((boundary = buffer.indexOf('\n\n')) >= 0) {
          const block = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2)
          const line = block.split('\n').find(v => v.startsWith('data: '))
          if (!line) continue
          const note = JSON.parse(line.slice(6)).notification
          if (note?.roomId !== room.id || note.displayName !== profile.name || note.role !== 'ai') continue
          const match = note.text.match(/\/plugins\/deepseek-harness-chatroom\/api\/files\/([0-9a-f-]{36})/u)
          if (!match) { console.log(JSON.stringify({ model: profile.name, reply: note.text.slice(0,1000) })); continue }
          const file = await fetch(base + prefix + '/files/' + match[1], { headers: { Cookie: cookie, Origin: base }, signal: controller.signal })
          assert.equal(file.status, 200)
          const data = Buffer.from(await file.arrayBuffer())
          const metadata = await sharp(data).metadata()
          assert.equal(metadata.format, 'png')
          assert.ok(metadata.width > 0 && metadata.height > 0)
          const artifact = `G:/codex-project/dsh-chatroom-next/review-artifacts/${marker}-${index}.png`
          await writeFile(artifact, data)
          if (!guest) {
            const denied = await fetch(base + prefix + '/files/' + match[1], { signal: controller.signal })
            assert.equal(denied.status, 401)
          }
          found = { model: profile.name, fileId: match[1], artifact, bytes: data.length, width: metadata.width, height: metadata.height, sha256: createHash('sha256').update(data).digest('hex'), elapsedMs: Date.now()-started }
          results.push(found)
          console.log(JSON.stringify(found))
          break outer
        }
      }
      assert.ok(found, `${profile.name} did not deliver a real image`)
    } finally { clearTimeout(timer); controller.abort() }
  }
  await writeFile(`G:/codex-project/dsh-chatroom-next/review-artifacts/${marker}.json`, JSON.stringify({ base, roomId: room.id, profiles, results }, null, 2))
  console.log(JSON.stringify({ imageAcceptance: 'passed', images: results.length }))
} finally {
  for (const profile of profiles) await request('/rooms/agents', { roomId: room.id, profileId: profile.id, action: 'cancel' }).catch(() => undefined)
  if (!guest) await request('/auth/logout', {}).catch(() => undefined)
}
