import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
const base = 'http://127.0.0.1:3186', prefix = '/plugins/deepseek-harness-chatroom/api'
const stdout = await readFile(new URL('./RC127-isolated-r2.stdout.log', import.meta.url), 'utf8')
const loginUrl = stdout.match(/http:\/\/127\.0\.0\.1:3186\/\?token=[^\s]+/u)?.[0]
assert.ok(loginUrl, 'Native test login URL missing')
const browser = await chromium.launch({ headless: true })
const receipt = { version: '1.5.0-codex.rc1.27', at: new Date().toISOString(), kind: 'isolated-native-host', passed: false }
try {
  const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const errors = []; receipt.errors = errors; page.on('pageerror', error => errors.push(error.message))
  receipt.responses = []; page.on('response', response => { if (response.status() >= 400) receipt.responses.push({ path: new URL(response.url()).pathname, status: response.status() }) })
  page.on('requestfailed', request => errors.push(new URL(request.url()).pathname + ': ' + request.failure()?.errorText))
  const nativeLogin = await context.request.get(loginUrl, { timeout: 8000 })
  receipt.nativeLogin = nativeLogin.status()
  assert.equal(nativeLogin.status(), 200)
  const identity = await context.request.post(base + prefix + '/session', { data: { displayName: '权限与进展隔离验收', avatarId: 'whale' }, headers: { Origin: base } })
  assert.equal(identity.status(), 201)
  await page.goto(base, { waitUntil: 'commit', timeout: 10000 })
  await page.getByRole('button', { name: '设置', exact: true }).waitFor({ timeout: 20000 })
  const html = await context.request.get(base).then(r => r.text())
  const clientUrl = html.match(/"id":"deepseek-harness-chatroom","url":"([^"]+)"/u)?.[1]
  assert.ok(clientUrl)
  const client = await context.request.get(base + clientUrl).then(r => r.text())
  assert.ok(client.includes('dsh-chatroom-model-progress'))
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.getByRole('dialog').filter({ hasText: '群聊与账号' }).waitFor({ timeout: 10000 })
  await page.screenshot({ path: new URL('./RC127-isolated-settings.png', import.meta.url).pathname.replace(/^\/(\w:)/, '$1') })
  assert.deepEqual(errors, [])
  receipt.passed = true; receipt.settings = true; receipt.progressBundle = true; receipt.clientUrl = clientUrl
} catch (error) {
  receipt.error = String(error).replace(/token=[^\s"']+/g, 'token=[redacted]')
  throw error
} finally {
  await browser.close()
  await writeFile(new URL('./RC127-isolated-r2-acceptance.json', import.meta.url), JSON.stringify(receipt, null, 2))
  console.log(JSON.stringify(receipt))
}
