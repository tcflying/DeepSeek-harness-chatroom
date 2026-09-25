import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
const secrets = JSON.parse((await readFile('C:/Users/datoo/.dsh/service/chatroom-secrets.json', 'utf8')).replace(/^\uFEFF/, ''))
const local = 'http://127.0.0.1:3181', base = 'https://talk.opcvip.net', prefix = '/plugins/deepseek-harness-chatroom/api'
async function login(admin) {
  const response = await fetch(local + prefix + '/auth/login', { method: 'POST', headers: { Origin: local, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: admin ? secrets.adminUsername : secrets.testUsername, password: admin ? secrets.adminPassword : secrets.testPassword }) })
  assert.equal(response.status, 200)
  return { cookie: response.headers.getSetCookie().map(v => v.split(';')[0]).join('; '), session: await response.json() }
}
const admin = await login(true), member = await login(false)
const room = member.session.rooms.find(room => room.title.startsWith('GPT 与 M3 生图验收'))
assert.ok(room, 'Existing designated acceptance room required')
const post = async (path, data, cookie = admin.cookie) => {
  const response = await fetch(local + prefix + path, { method: 'POST', headers: { Origin: local, Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: AbortSignal.timeout(15000) })
  assert.equal(response.status, 200, path); return response.json()
}
const existing = await fetch(local + prefix + '/rooms/agents?roomId=' + room.id, { headers: { Cookie: admin.cookie } }).then(r => r.json())
const proxyUrl = new URL(process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY)
const browser = await chromium.launch({ headless: true, proxy: { server: proxyUrl.origin, bypass: 'localhost,127.0.0.1' } })
const profiles = [], events = [], stamp = Date.now()
const receipt = { version: '1.5.0-codex.rc1.29', at: new Date().toISOString(), kind: 'real-provider-public-browser-progress', runs: [], passed: false }
const abort = new AbortController()
let reader
let page
try {
  const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1440, height: 900 } })
  await context.addCookies(member.cookie.split('; ').map(pair => ({ name: pair.slice(0, pair.indexOf('=')), value: pair.slice(pair.indexOf('=') + 1), url: base, httpOnly: true, secure: true })))
  page = await context.newPage()
  await page.goto(base + '/?dsh-chatroom-room=' + room.id, { waitUntil: 'commit', timeout: 15000 })
  await page.getByRole('button', { name: '我的账号', exact: true }).waitFor({ timeout: 30000 })
  const expand = page.getByRole('button', { name: '打开侧边栏', exact: true })
  if (await expand.count()) await expand.click()
  await page.getByRole('treeitem').first().waitFor({ timeout: 25000 })
  receipt.sidebar = await page.getByRole('treeitem').allTextContents()
  console.log(JSON.stringify({ sidebar: receipt.sidebar }))
  await page.getByRole('button', { name: '群成员', exact: true }).waitFor({ timeout: 25000 })
  assert.equal(await page.getByRole('button', { name: '设置', exact: true }).count(), 0)
  receipt.memberConversationOpened = true
  const response = await fetch(local + prefix + '/events?roomId=' + room.id, { headers: { Cookie: member.cookie }, signal: abort.signal })
  assert.equal(response.status, 200)
  reader = (async () => {
    let text = ''
    for await (const chunk of response.body) {
      text += new TextDecoder().decode(chunk, { stream: true })
      for (;;) {
        const end = text.indexOf('\n\n'); if (end < 0) break
        const frame = text.slice(0, end); text = text.slice(end + 2)
        const data = frame.split('\n').find(line => line.startsWith('data: '))?.slice(6)
        if (!data) continue
        const event = JSON.parse(data)
        if (event.type === 'model-progress') events.push(event.progress)
      }
    }
  })().catch(error => { if (!abort.signal.aborted) throw error })
  for (const label of ['GPT', 'M3']) {
    const template = existing.profiles.find(profile => profile.name === label + '生图验收')
    assert.ok(template, label + ' configured route required')
    const name = label + '进展验收' + stamp
    const created = await post('/rooms/agents', { roomId: room.id, action: 'create', name, role: '仅文字进展验收',
      instructions: '本次只验证文字流。严禁调用任何工具，严禁生成图片、音频或视频。请根据用户要求输出一小段文字。',
      provider: template.provider, model: template.model, reasoningEffort: template.reasoningEffort ?? '', enabled: true })
    const profile = created.profiles.find(profile => profile.name === name); assert.ok(profile)
    profiles.push(profile)
    const sessionId = `chatroom-agent-v1-${room.id}-${profile.id}`
    const marker = label + '-PROGRESS-' + stamp
    await post('/prompt', { roomId: room.id, requestId: marker, mode: 'queue', content: [{ type: 'text', text: `@${name} 这是界面进展验收。不要调用工具。请用约 120 字解释为什么判断在线状态要同时查看最近收到数据的时间，最后原样写 ${marker}。` }] }, member.cookie)
    const row = page.locator('.dsh-chatroom-progress-row').filter({ hasText: name })
    await row.waitFor({ timeout: 25000 })
    const samples = [], start = Date.now()
    for (;;) {
      const own = events.filter(event => event.sessionId === sessionId)
      if (await row.count()) {
        const sample = { at: Date.now(), state: await row.getAttribute('data-state'), text: (await row.innerText()).slice(0, 650) }
        if (samples.at(-1)?.text !== sample.text) samples.push(sample)
      }
      if (own.some(event => ['completed', 'failed', 'stopped'].includes(event.status))) break
      assert.ok(Date.now() - start < 90000, label + ' progress deadline')
      await new Promise(resolve => setTimeout(resolve, 150))
    }
    const own = events.filter(event => event.sessionId === sessionId)
    const run = { label, sessionId, events: own, samples }
    receipt.runs.push(run)
    assert.equal(own.at(-1)?.status, 'completed')
    assert.ok(own.some(event => event.status === 'thinking' || event.status === 'writing'))
    assert.ok(samples.some(sample => sample.state === 'thinking' || sample.state === 'writing'))
    assert.ok(!own.some(event => event.status === 'tool'), 'Text-only acceptance must not invoke tools')
    await page.screenshot({ path: new URL(`./RC129-progress-${label}.png`, import.meta.url).pathname.replace(/^\/(\w:)/, '$1') })
    console.log(JSON.stringify({ label, completed: true, eventCount: own.length, sampleCount: samples.length }))
  }
  receipt.passed = true
} catch (error) {
  receipt.error = String(error)
  if (page) receipt.pageText = (await page.locator('body').innerText({ timeout: 5000 }).catch(() => 'unreadable')).slice(0, 900)
  throw error
}
finally {
  abort.abort(); await reader
  for (const profile of profiles) await post('/rooms/agents', { roomId: room.id, action: 'delete', profileId: profile.id }).catch(error => { receipt.cleanupError = String(error) })
  receipt.testProfilesRemoved = !receipt.cleanupError
  await writeFile(new URL('./RC129-progress-provider.json', import.meta.url), JSON.stringify(receipt, null, 2))
  console.log(JSON.stringify({ passed: receipt.passed, error: receipt.error, testProfilesRemoved: receipt.testProfilesRemoved }))
  await browser.close()
}
