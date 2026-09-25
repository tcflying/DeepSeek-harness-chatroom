import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { chromium } from 'playwright'

const source = await readFile(new URL('../src/client/qq2007-styles.ts', import.meta.url), 'utf8')
// Only brand artwork interpolation is omitted; it is outside every fixture.
const css = source.slice(source.indexOf('`') + 1, source.lastIndexOf('`')).replace('${CLASSIC_AVATAR_IMAGES[0]}', '')
const result = { version: '1.5.0-codex.rc1.50', at: new Date().toISOString(), sourceSha256: createHash('sha256').update(source).digest('hex'),
  scope: 'Fresh headless fixture without Vitest/Vite; real CSS except unused brand artwork interpolation; no network, user profile or app state', rows: [], functionalPassed: false, passed: false }
let browser, context
const bounded = (work, label) => Promise.race([work, new Promise((_, reject) => { const t = setTimeout(() => reject(new Error(label + ' exceeded15s')), 15_000); t.unref() })])
try {
  browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', timeout: 15_000 })
  context = await browser.newContext()
  const page = await context.newPage()
  for (const skin of ['default', 'qq2007']) for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 844 })
    await page.setContent(`<html data-dsh-chatroom-installed ${skin === 'qq2007' ? 'data-dsh-chatroom-style="qq2007"' : ''}><head><style>
      body { margin:0 } [data-slot] { display:contents } .frame { position:relative; height:844px }
      .sidebar-root { display:flex; flex-direction:column; background:white }
      .collapse { position:absolute; top:8px; left:180px; width:44px; height:44px }
      .settings-overlay { position:fixed; inset:0; z-index:100; background:white }
      .setting-action { position:fixed; top:360px; left:80px; width:80px; height:44px }
      .dsh-chatroom-sidebar-backdrop { display:none }
      ${css}
      @media(max-width:768px) {
        [data-dsh-frame]:not([data-sidebar-collapsed])::after { content:''; position:fixed; inset:0; z-index:1050; background:#0004 }
        [data-dsh-frame] [data-pane="sidebar"] { position:absolute; z-index:1100 }
      }
      </style></head><body><div data-slot="root"><div data-dsh-frame data-details-collapsed="false" class="frame">
      <div data-pane="sidebar"><div data-slot="sidebar"><div class="sidebar-root"><header><button class="collapse">收起</button></header><footer><div class="dsh-chatroom-server-status">连接正常</div><div data-slot="sidebar.settings"></div></footer></div></div></div>
      <div data-pane="conversation"><div data-slot="conversation"></div></div>
      <div data-pane="details"><div data-slot="details"><div style="position:absolute;inset:0;background:#eef">Files</div></div></div>
      </div></div><button class="dsh-chatroom-sidebar-backdrop">关闭导航</button></body></html>`, { timeout: 15_000 })
    const row = await page.evaluate(() => {
      const hit = selector => { const e = document.querySelector(selector), r = e.getBoundingClientRect(); const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { hit: h === e || e.contains(h), width: r.width, height: r.height, hitClass: h?.className } }
      const collapse = hit('.collapse'), backdrop = hit('.dsh-chatroom-sidebar-backdrop')
      document.querySelector('[data-dsh-frame]').setAttribute('data-sidebar-collapsed', 'true')
      document.querySelector('[data-slot="sidebar.settings"]').innerHTML = '<div class="settings-overlay"><div role="dialog"><div class="dsh-chatroom-settings"><button class="setting-action">启用成员</button></div></div></div>'
      const settings = hit('.setting-action')
      document.querySelector('[data-slot="sidebar.settings"]').replaceChildren()
      return { collapse, backdrop, settings, unmounted: document.querySelector('[role="dialog"]') === null }
    })
    result.rows.push({ skin, width, ...row })
    for (const k of ['collapse', 'backdrop', 'settings']) assert.equal(row[k].hit, true, `${skin}/${width}/${k}`)
    assert.equal(row.unmounted, true)
  }
  result.functionalPassed = true
} catch (error) { result.error = String(error); process.exitCode = 1 }
finally {
  try { if (context) await bounded(context.close(), 'context close'); if (browser) await bounded(browser.close(), 'browser close') }
  catch (error) { result.cleanupError = String(error); process.exitCode = 1 }
  result.passed = result.functionalPassed && process.exitCode !== 1
  await writeFile(new URL('RC150-mobile-layers-direct.json', import.meta.url), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
  console.log(JSON.stringify(result))
}
