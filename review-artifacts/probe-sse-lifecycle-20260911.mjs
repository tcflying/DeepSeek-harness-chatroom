import { readFile, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const prefix = '/plugins/deepseek-harness-chatroom/api'
const publicBase = 'https://talk.opcvip.net'
const secrets = JSON.parse(await readFile('C:/Users/datoo/.dsh/service/chatroom-secrets.json', 'utf8'))
const login = await fetch(publicBase + prefix + '/auth/login', { method: 'POST', headers: { Origin: publicBase, 'Content-Type': 'application/json' }, body: JSON.stringify({ username: secrets.testUsername, password: secrets.testPassword }), signal: AbortSignal.timeout(25000) })
assert.equal(login.status, 200)
const cookie = login.headers.getSetCookie().map(v => v.split(';')[0]).join('; ')
await login.arrayBuffer()
const rooms = await fetch(publicBase + prefix + '/rooms', { headers: { Cookie: cookie }, signal: AbortSignal.timeout(25000) }).then(r => r.json())
const room = rooms.rooms.find(r => r.title.includes('生图验收'))
assert.ok(room)
const duration = Number(process.argv[2] ?? 155000)
const evidence = { at: new Date().toISOString(), duration, results: [] }
async function probe(base, route) {
  const started = Date.now(), controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), duration)
  const result = { base, stream: route.startsWith('/events') ? 'room' : 'notifications', frames: [], bytes: 0 }
  try {
    const r = await fetch(base + prefix + route, { headers: { Cookie: cookie, Origin: publicBase, Host: 'talk.opcvip.net' }, signal: controller.signal })
    Object.assign(result, { status: r.status, headersMs: Date.now() - started, type: r.headers.get('content-type'), operationId: r.headers.get('x-chatroom-stream-id') })
    console.log(JSON.stringify({ ...result, stage: 'headers' }))
    const reader = r.body.getReader(), decoder = new TextDecoder()
    let partial = ''
    while (true) {
      const next = await reader.read()
      if (next.done) { result.ended = true; break }
      result.bytes += next.value.length
      partial += decoder.decode(next.value, { stream: true })
      const frames = partial.split('\n\n'); partial = frames.pop()
      for (const frame of frames) {
        const type = frame.startsWith(':') ? 'comment-heartbeat' : frame.match(/^event: ([\w-]+)/m)?.[1] ?? 'data'
        result.frames.push({ ms: Date.now() - started, type, bytes: Buffer.byteLength(frame) })
      }
    }
  } catch (e) { result.error = controller.signal.aborted ? 'probe-complete' : e.cause?.code ?? e.name }
  finally { clearTimeout(timer); result.elapsedMs = Date.now() - started; evidence.results.push(result); console.log(JSON.stringify(result)) }
}
try {
  await Promise.all(['http://127.0.0.1:3181', 'http://127.0.0.1:3185', publicBase].flatMap(base => ['/notifications', `/events?roomId=${room.id}`].map(route => probe(base, route))))
  const path = new URL(`./SSE-LIFECYCLE-${Date.now()}.json`, import.meta.url)
  await writeFile(path, JSON.stringify(evidence, null, 2)); console.log(path.pathname)
} finally {
  await fetch(publicBase + prefix + '/auth/logout', { method: 'POST', headers: { Cookie: cookie, Origin: publicBase, 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(15000) }).then(r => r.arrayBuffer()).catch(() => {})
}
