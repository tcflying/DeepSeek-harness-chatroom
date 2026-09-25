import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
const base = 'http://127.0.0.1:3181', prefix = '/plugins/deepseek-harness-chatroom/api'
const roomId = '29f58452-d88b-4495-9aee-03028b49df15', sessionId = `chatroom-v1-${roomId}`
const secrets = JSON.parse(await readFile('C:/Users/datoo/.dsh/service/chatroom-secrets.json', 'utf8'))
let cookie = ''
async function request(path, body) {
  const response = await fetch(base + prefix + path, { method: body ? 'POST' : 'GET', headers: { Origin: base, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000) })
  if (response.ok && response.headers.getSetCookie().length) cookie = response.headers.getSetCookie().map(v => v.split(';')[0]).join('; ')
  const value = await response.json(); assert.ok(response.ok, `${path} HTTP ${response.status}: ${value.error ?? ''}`); return value
}
await request('/auth/login', { username: secrets.testUsername, password: secrets.testPassword })
const marker = `EDIT-${Date.now()}`, results = [], profiles = []
const evidence = { at: new Date().toISOString(), marker, roomId, sourceFileId: '', results }
try {
  const gallery = await request(`/media/gallery?roomId=${roomId}&sessionId=${sessionId}`)
  const sourceFileId = gallery.items.find(item => item.fileId)?.fileId
  assert.ok(sourceFileId); evidence.sourceFileId = sourceFileId
  for (const route of [{ name: 'GPT框选验收', provider: 'oc-gpt6-low', model: 'gpt-6-astra', reasoningEffort: 'low' }, { name: 'M3框选验收', provider: 'minimax-cn', model: 'MiniMax-M3', reasoningEffort: 'high' }]) {
    const view = await request('/rooms/agents', { roomId, action: 'create', ...route, role: '本次框选改图验收', enabled: true,
      instructions: '仅处理当前用户请求。调用实际 chatroom_edit_image 工具一次，使用给定的 sourceFileId 和 selectionJson；不要使用 chatroom_generate_image、终端、搜索或代码作图替代。不要自动重试。成功后返回本次工具结果的图片预览；若失败如实报告本次错误。' })
    const profile = view.profiles.find(p => p.name === route.name); assert.ok(profile); profiles.push(profile)
  }
  for (const [index, profile] of profiles.entries()) {
    const controller = new AbortController(), started = Date.now()
    const timer = setTimeout(() => controller.abort(), 330000)
    try {
      const stream = await fetch(base + prefix + '/notifications', { headers: { Cookie: cookie, Origin: base }, signal: controller.signal })
      assert.equal(stream.status, 200)
      await request('/prompt', { roomId, mode: 'queue', requestId: `${marker}-${index}`, content: [{ type: 'text', text: `@${profile.name} 已授权框选改图实测：实际调用一次 chatroom_edit_image。sourceFileId=${sourceFileId}；selectionJson={"x":0.25,"y":0.25,"width":0.5,"height":0.5}；prompt=把选区中心的蓝色圆形改成${index ? '绿色' : '红色'}圆形，保持白色背景与其他部分。quality=low。只能改原图，不能文生图或复用历史结果；失败不重试。回传预览并附 ${marker}-${index}。` }] })
      let buffer = '', found
      outer: for await (const chunk of stream.body.pipeThrough(new TextDecoderStream())) {
        buffer += chunk
        let boundary
        while ((boundary = buffer.indexOf('\n\n')) >= 0) {
          const block = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2)
          const line = block.split('\n').find(line => line.startsWith('data: ')); if (!line) continue
          const note = JSON.parse(line.slice(6)).notification
          if (note?.roomId !== roomId || note.displayName !== profile.name || note.role !== 'ai') continue
          const id = note.text.match(/\/plugins\/deepseek-harness-chatroom\/api\/files\/([0-9a-f-]{36})/u)?.[1]
          if (!id || id === sourceFileId) { console.log(JSON.stringify({ name: profile.name, reply: note.text.slice(0, 1400) })); continue }
          const response = await fetch(base + prefix + '/files/' + id, { headers: { Cookie: cookie }, signal: controller.signal })
          assert.equal(response.status, 200)
          const data = Buffer.from(await response.arrayBuffer()), metadata = await sharp(data).metadata()
          assert.equal(metadata.format, 'png')
          const path = new URL(`./${marker}-${index}.png`, import.meta.url)
          await writeFile(path, data)
          found = { name: profile.name, provider: profile.provider, model: profile.model, fileId: id, artifact: path.pathname, bytes: data.length, width: metadata.width, height: metadata.height, sha256: createHash('sha256').update(data).digest('hex'), elapsedMs: Date.now() - started }
          results.push(found); console.log(JSON.stringify(found)); break outer
        }
      }
      assert.ok(found, 'No newly edited image received')
    } finally { clearTimeout(timer); controller.abort() }
  }
} finally {
  await writeFile(new URL('./GALLERY-MEDIA-edit-20260911.json', import.meta.url), JSON.stringify(evidence, null, 2))
  for (const profile of profiles) await request('/rooms/agents', { roomId, profileId: profile.id, action: 'cancel' }).catch(() => undefined)
  await request('/auth/logout', {}).catch(() => undefined)
}
