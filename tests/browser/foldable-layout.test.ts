import { afterEach, describe, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { ChatroomSettingsSection } from '../../src/client/ChatroomAccountPanels.js'
import { CHATROOM_STYLES } from '../../src/client/styles.js'
import type { ChatroomView } from '../../src/client/store.js'

let root: Root | undefined
afterEach(async () => {
  root?.unmount()
  root = undefined
  document.head.replaceChildren()
  document.body.replaceChildren()
  await page.viewport(1280, 720)
})

function mount(css = ''): void {
  const style = document.createElement('style')
  // The two-column host structure comes from the observed 3186 Settings dialog.
  // No native stylesheet is changed by this fixture or the plugin.
  style.textContent = `body { margin:0; font:14px/1.5 sans-serif }
    .fixture-dialog { display:flex; width:min(1100px, calc(100% - 48px)); height:calc(100dvh - 48px); margin:24px; overflow:hidden }
    .fixture-dialog > nav { display:flex; flex-direction:column; flex:0 0 188px; box-sizing:border-box; padding:22px 12px 0 }
    .fixture-dialog > nav > div { display:flex; flex-direction:column }
    .fixture-dialog > div { display:flex; flex:1; min-width:0; flex-direction:column }
    .fixture-options { padding:0 24px 24px; overflow:auto }
    [data-slot] { display:contents }
    ${CHATROOM_STYLES}\n${css}`
  document.head.append(style)
}

function renderAccountInHost(): HTMLDivElement {
  document.body.innerHTML = `<div class="fixture-dialog" role="dialog" aria-label="设置">
    <nav><div>设置</div><div><button>通用设置</button><button>模型</button><button>Agent 预设</button><button>群聊与账号</button></div></nav>
    <div><header><button aria-label="关闭">关闭</button></header><div class="fixture-options"><div data-slot="settings.section"></div></div></div></div>`
  const container = required<HTMLDivElement>('[data-slot="settings.section"]')
  const room = { auth: { enabled:true, authenticated:true, canManageSettings:false, account: {
    participantId:'layout-member', username:'layout-member', displayName:'折叠屏布局验收成员',
    role:'member', status:'active', passwordManaged:false,
  } }, manageableRooms:[{ id:'layout-room', title:'多人协作与折叠屏专项验证房间' }], agentProfilesRoomId:'layout-room',
    agentProfiles:{ canManage:true, profiles:[], models:[{ provider:'layout', model:'example-model', label:'布局模型 · 仅测试', reasoningEfforts:['high'] }] },
    wecomAuthorization:{ enabled:false, status:'unauthorized' } } as unknown as ChatroomView
  const props = { useChatroom:(selector:(view:ChatroomView)=>unknown)=>selector(room), logout:vi.fn(async()=>undefined),
    openAdmin:vi.fn(async()=>undefined) } as unknown as Parameters<typeof ChatroomSettingsSection>[0]
  root = createRoot(container)
  flushSync(() => root!.render(createElement(ChatroomSettingsSection, props)))
  return container
}

describe('phone and foldable plugin layout', () => {
  it.each([
    [320, 740], [360, 780], [390, 844], [540, 720], [720, 900], [853, 720], [1100, 820], [1440, 900], [844, 390],
  ])('keeps the real account section usable inside the native settings shell at %ix%i', async (width, height) => {
    await page.viewport(width, height)
    mount()
    renderAccountInHost()
    const panel = required<HTMLElement>('.fixture-dialog')
    const settings = required<HTMLElement>('.dsh-chatroom-settings')
    const panelBox = panel.getBoundingClientRect()
    expect(panelBox.right).toBeLessThanOrEqual(width)
    expect(panelBox.bottom).toBeLessThanOrEqual(height)
    expect(settings.getBoundingClientRect().width).toBeGreaterThanOrEqual(width <= 640 ? width - 66 : 180)
    for (const control of settings.querySelectorAll<HTMLElement>('input, select, button')) {
      const box = control.getBoundingClientRect()
      expect(box.width).toBeGreaterThan(0)
      expect(box.left).toBeGreaterThanOrEqual(panelBox.left)
      expect(box.right).toBeLessThanOrEqual(panelBox.right + 1)
    }
    const logout = [...settings.querySelectorAll('button')].find(button => button.textContent === '退出登录')!
    logout.scrollIntoView({ block:'nearest' })
    expect(logout.getBoundingClientRect().bottom).toBeLessThanOrEqual(panelBox.bottom + 1)
    expect(settings.querySelector('[aria-label="系统管理"]')).toBeNull()
    expect(parseFloat(getComputedStyle(required('.dsh-chatroom-account-card .dsh-chatroom-panel-status')).paddingTop)).toBeLessThanOrEqual(8)
  })

  it('uses available container width, not device width, and keeps drafts on unfold/refold', async () => {
    await page.viewport(1440, 900)
    mount()
    document.body.innerHTML = `<main style="width:300px"><section class="dsh-chatroom-settings">
      <section class="dsh-chatroom-card"><div class="dsh-chatroom-admin-form"><label>名称<input value="未保存的机器人名称"></label><label>模型<select><option>很长的模型路由名称</option></select></label></div></section>
      <section class="dsh-chatroom-card">另一个配置区</section></section></main>`
    const settings = required<HTMLElement>('.dsh-chatroom-settings')
    const form = required<HTMLElement>('.dsh-chatroom-admin-form')
    const main = required<HTMLElement>('main')
    expect(getComputedStyle(form).gridTemplateColumns.split(' ')).toHaveLength(1)
    main.style.width = '1100px'
    await expect.poll(() => getComputedStyle(settings).gridTemplateColumns.split(' ').length).toBe(2)
    expect(getComputedStyle(form).gridTemplateColumns.split(' ')).toHaveLength(2)
    main.style.width = '300px'
    await expect.poll(() => getComputedStyle(form).gridTemplateColumns.split(' ').length).toBe(1)
    expect(required<HTMLInputElement>('input').value).toBe('未保存的机器人名称')
    expect(form.scrollWidth).toBeLessThanOrEqual(300)
  })

  it('does not restyle an unrelated native settings section', async () => {
    await page.viewport(390, 844)
    mount()
    document.body.innerHTML = '<div class="fixture-dialog" role="dialog"><nav>模型</nav><div>原生内容</div></div>'
    expect(getComputedStyle(required('.fixture-dialog')).flexDirection).toBe('row')
    expect(required('nav').getBoundingClientRect().width).toBe(188)
  })

  it.each([390, 853, 1100])('keeps private-chat composer reachable on a short %ipx-wide viewport', async width => {
    await page.viewport(width, 390)
    mount()
    document.body.innerHTML = `<section class="dsh-chatroom-direct-panel"><header>私聊</header>
      <div class="dsh-chatroom-direct-messages">${'<p>聊天历史</p>'.repeat(35)}</div>
      <form class="dsh-chatroom-direct-composer"><textarea aria-label="消息">未发送草稿</textarea><div class="dsh-chatroom-direct-composer-tools"><button type="button">附件</button><button class="dsh-chatroom-direct-send" type="button">发送</button></div></form></section>`
    const messages = required<HTMLElement>('.dsh-chatroom-direct-messages')
    const composer = required<HTMLElement>('.dsh-chatroom-direct-composer')
    expect(messages.getBoundingClientRect().height).toBeGreaterThan(100)
    expect(messages.getBoundingClientRect().bottom).toBeLessThanOrEqual(composer.getBoundingClientRect().top + 1)
    expect(composer.getBoundingClientRect().bottom).toBeLessThanOrEqual(390)
    expect(parseFloat(getComputedStyle(messages).paddingBottom)).toBeLessThanOrEqual(24)
    expect(required('textarea').getBoundingClientRect().width).toBeGreaterThan(150)
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width)
  })
})

function required<T extends HTMLElement = HTMLElement>(selector:string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Missing layout element: ${selector}`)
  return element
}
