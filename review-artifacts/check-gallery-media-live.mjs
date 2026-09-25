import { readFile, writeFile, readdir, stat } from 'node:fs/promises'
import assert from 'node:assert/strict'
import sharp from 'sharp'
const base = process.argv[2] ?? 'https://talk.opcvip.net'
assert.ok(['https://talk.opcvip.net', 'http://127.0.0.1:3186'].includes(base))
const prefix = '/plugins/deepseek-harness-chatroom/api', guest = base.endsWith(':3186')
let cookie = ''
async function request(path, body) {
  const response = await fetch(base + prefix + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Origin: base, ...(cookie ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(25000) })
  if (response.ok && response.headers.getSetCookie().length) cookie = response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
  if (!response.ok) { const error = await response.json().catch(() => ({})); throw new Error(`${path} HTTP ${response.status} ${error.error ?? ''}`) }
  return response.json()
}
if (guest) await request('/session', { displayName: '媒体验收', avatarId: 'whale' })
else {
  const secrets = JSON.parse(await readFile('C:/Users/datoo/.dsh/service/chatroom-secrets.json', 'utf8'))
  await request('/auth/login', { username: secrets.testUsername, password: secrets.testPassword })
}
const evidence = { at: new Date().toISOString(), base, rooms: [], images: [], negatives: {} }
try {
  const { rooms } = await request('/rooms')
  for (const room of rooms.filter(room => room.title.includes('生图验收'))) {
    if (guest) await request('/rooms/select', { roomId: room.id })
    const query = `roomId=${encodeURIComponent(room.id)}&sessionId=${encodeURIComponent(room.sessionId)}`
    const gallery = await request('/media/gallery?' + query)
    evidence.rooms.push({ roomId: room.id, sessionId: room.sessionId, count: gallery.items.length, more: gallery.next !== undefined })
    if (evidence.images.length || !gallery.items.some(item => item.fileId)) continue
    const item = gallery.items.find(item => item.fileId)
    for (const preview of [false, true]) {
      const response = await fetch(base + item.url + (preview ? '?preview=thumbnail' : ''), { headers: { Cookie: cookie }, signal: AbortSignal.timeout(25000) })
      assert.equal(response.status, 200)
      const data = Buffer.from(await response.arrayBuffer()), meta = await sharp(data).metadata()
      evidence.images.push({ roomId: room.id, sessionId: room.sessionId, imageId: item.id, fileId: item.fileId, preview, bytes: data.length, format: meta.format, width: meta.width, height: meta.height })
      if (preview) { assert.equal(meta.format, 'webp'); assert.ok(meta.width <= 480 && meta.height <= 320) }
    }
    for (const [name, path] of [['foreignSession', `/media/gallery?roomId=${room.id}&sessionId=invalid-session`], ['anonymousImage', item.url + '?preview=thumbnail'], ['anonymousGallery', '/media/gallery?' + query]]) {
      const response = await fetch(base + prefix + (path.startsWith(prefix) ? path.slice(prefix.length) : path), { headers: name === 'foreignSession' ? { Cookie: cookie } : {}, signal: AbortSignal.timeout(15000) })
      await response.arrayBuffer(); evidence.negatives[name] = response.status
      if (name === 'foreignSession') assert.equal(response.status, 422)
      else if (!guest) assert.equal(response.status, 401)
    }
  }
  assert.ok(evidence.images.length, 'Need at least one real image')
  if (!guest) {
    const r = await fetch(base + prefix + `/media/videos?roomId=${evidence.rooms[0].roomId}&sessionId=${evidence.rooms[0].sessionId}`, { headers: { Cookie: cookie } })
    evidence.negatives.nonAdminVideo = r.status; await r.arrayBuffer(); assert.equal(r.status, 403)
  }
  await writeFile(new URL(`./GALLERY-MEDIA-${guest ? 'isolated' : 'public'}-20260911.json`, import.meta.url), JSON.stringify(evidence, null, 2))
  console.log(JSON.stringify(evidence))
} finally { if (!guest) await request('/auth/logout', {}).catch(() => undefined) }
