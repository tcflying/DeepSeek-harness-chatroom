import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
import { createHash } from 'node:crypto'
const secrets = JSON.parse((await readFile('C:/Users/datoo/.dsh/service/chatroom-secrets.json', 'utf8')).replace(/^\uFEFF/, ''))
const base = 'https://talk.opcvip.net', prefix = '/plugins/deepseek-harness-chatroom/api'
const receipt = { version: '1.5.0-codex.rc1.27', at: new Date().toISOString(), surface: 'independent-browser-public-host', roles: [], passed: false }
// Match the machine's existing public-network route; do not change system proxy settings.
const proxyUrl = new URL(process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY ?? 'http://127.0.0.1:0')
assert.notEqual(proxyUrl.port, '0', 'Existing environment proxy required for this public-network test')
const proxy = { server: proxyUrl.origin, bypass: 'localhost,127.0.0.1',
  ...(proxyUrl.username ? { username: decodeURIComponent(proxyUrl.username), password: decodeURIComponent(proxyUrl.password) } : {}) }
const browser = await chromium.launch({ headless: true, proxy })
try {
  for (const role of ['member', 'super-admin']) {
    const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1440, height: 900 } })
    let page
    try {
      const login = await context.request.post(base + prefix + '/auth/login', { headers: { Origin: base }, data: {
        username: role === 'member' ? secrets.testUsername : secrets.adminUsername,
        password: role === 'member' ? secrets.testPassword : secrets.adminPassword,
      }, timeout: 20000 })
      assert.equal(login.status(), 200)
      const session = await login.json()
      assert.equal(session.auth.account.role, role)
      assert.equal(session.auth.canManageSettings, role === 'super-admin')
      const item = { role, canManageSettings: session.auth.canManageSettings, api: [], errors: [] }
      receipt.roles.push(item)
      for (const method of ['settings/describe', 'credentials/list']) {
        const response = await context.request.post(base + '/api/' + method, { headers: { Origin: base }, data: {
          type: 'client-request', rpcId: 'permission-read-' + role, method, payload: { args: {} },
        } })
        item.api.push({ method, status: response.status() })
        if (role === 'member') assert.equal(response.status(), 403)
        else assert.notEqual(response.status(), 403)
      }
      const room = session.rooms.find(room => room.title.startsWith('GPT 与 M3 生图验收')) ?? session.rooms[0]
      if (room && role === 'member') {
        const profiles = await context.request.get(base + prefix + '/rooms/agents?roomId=' + room.id).then(r => r.json())
        assert.equal(profiles.canManage, false)
        assert.ok(profiles.profiles.every(profile => !profile.instructions && !profile.provider && !profile.model))
        for (const [method, args] of [
          ['session/selectModel', { sessionId: room.sessionId, provider: 'invalid-acceptance-route', model: 'invalid-acceptance-model' }],
          ['agentPresets/select', { sessionId: room.sessionId, presetId: 'invalid-acceptance-preset' }],
          ['commands/execute', { sessionId: room.sessionId, line: '/permission invalid-acceptance-preset' }],
        ]) {
          const response = await context.request.post(base + '/api/' + method, { headers: { Origin: base }, data: {
            type: 'client-request', rpcId: 'permission-denial', method, payload: { args },
          } })
          item.api.push({ method, status: response.status() }); assert.equal(response.status(), 403)
        }
      }
      page = await context.newPage()
      page.on('pageerror', error => item.errors.push(error.message))
      await page.goto(base, { waitUntil: 'commit', timeout: 15000 })
      await page.getByRole('button', { name: '我的账号', exact: true }).waitFor({ timeout: 25000 })
      const settings = page.getByRole('button', { name: '设置', exact: true })
      if (role === 'member') {
        assert.equal(await settings.count(), 0)
        assert.equal(await page.getByRole('button', { name: 'AI 成员', exact: true }).count(), 0)
        assert.equal(await page.getByRole('button', { name: '群管理', exact: true }).count(), 0)
        await page.keyboard.press('Control+,')
        assert.equal(await page.getByRole('dialog', { name: '设置', exact: true }).count(), 0)
        item.settingsAbsent = true
        await page.getByRole('button', { name: '我的账号', exact: true }).click()
        await page.getByRole('dialog', { name: '我的账号', exact: true }).waitFor()
        item.personalDialog = await page.locator('dialog[aria-label="我的账号"]').evaluate(el => el.matches(':modal'))
        assert.equal(item.personalDialog, true)
        await page.screenshot({ path: new URL('./RC127-member-desktop.png', import.meta.url).pathname.replace(/^\/(\w:)/, '$1') })
        await page.setViewportSize({ width: 390, height: 844 })
        item.mobile = await page.locator('dialog[aria-label="我的账号"]').evaluate(el => ({ width: el.getBoundingClientRect().width, right: el.getBoundingClientRect().right, scroll: el.scrollWidth }))
        assert.ok(item.mobile.right <= 390 && item.mobile.scroll <= 390)
        await page.screenshot({ path: new URL('./RC127-member-mobile.png', import.meta.url).pathname.replace(/^\/(\w:)/, '$1') })
      } else {
        await settings.click()
        await page.getByRole('dialog').filter({ hasText: '群聊与账号' }).waitFor()
        item.settingsAvailable = true
      }
      assert.deepEqual(item.errors, [])
    } catch (error) {
      if (page) {
        receipt.failurePage = { pathname: new URL(page.url()).pathname, buttons: await page.getByRole('button').allTextContents(),
          body: (await page.locator('body').innerText()).slice(0, 1300), installed: await page.locator('html').getAttribute('data-dsh-chatroom-installed') }
        await page.screenshot({ path: new URL('./RC127-public-failure.png', import.meta.url).pathname.replace(/^\/(\w:)/, '$1') })
      }
      throw error
    } finally { await context.close() }
  }
  const requestContext = await browser.newContext({ proxy })
  const html = await requestContext.request.get('http://127.0.0.1:3181/').then(r => r.text())
  const clientUrl = html.match(/"id":"deepseek-harness-chatroom","url":"([^"]+)"/u)?.[1]
  assert.ok(clientUrl)
  receipt.clients = []
  for (const host of ['http://127.0.0.1:3181', base]) {
    const client = await requestContext.request.get(host + clientUrl, { timeout: 20000 }).then(r => r.text())
    assert.ok(client.includes('dsh-chatroom-model-progress'))
    receipt.clients.push({ host, sha256: createHash('sha256').update(client).digest('hex'), bytes: Buffer.byteLength(client) })
  }
  assert.equal(receipt.clients[0].sha256, receipt.clients[1].sha256)
  await requestContext.close()
  receipt.passed = true
} catch (error) { receipt.error = String(error); throw error }
finally {
  await writeFile(new URL('./RC127-public-permissions-r3.json', import.meta.url), JSON.stringify(receipt, null, 2))
  console.log(JSON.stringify(receipt))
  await browser.close()
}
