import { afterEach, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { CHATROOM_STYLES } from '../../src/client/styles.js'
import { QQ2007_STYLES } from '../../src/client/qq2007-styles.js'

afterEach(async () => {
  document.head.replaceChildren()
  document.body.replaceChildren()
  document.documentElement.removeAttribute('data-dsh-chatroom-installed')
  document.documentElement.removeAttribute('data-dsh-chatroom-style')
  await page.viewport(1280, 720)
})

it.each([320, 390, 768, 1440])('keeps progress, Files-side dialogs and media preview inside %ipx', async width => {
  await page.viewport(width, 844)
  const style = document.createElement('style')
  style.textContent = `body { margin: 0; --bg-primary:#fff; --bg-secondary:#eef4fa; --text-primary:#173a61; }
    ${CHATROOM_STYLES}${QQ2007_STYLES}`
  document.head.append(style)
  document.documentElement.dataset.dshChatroomInstalled = ''
  document.documentElement.dataset.dshChatroomStyle = 'qq2007'
  document.body.innerHTML = `<aside style="position:fixed;inset:0 0 0 50%;z-index:2147483647;background:#fff">Files</aside>
    <section class="dsh-chatroom-model-progress"><div class="dsh-chatroom-progress-row" data-state="thinking">
      <i class="dsh-chatroom-progress-dot"></i><strong><span class="dsh-chatroom-progress-name">${'非常长的模型成员名称'.repeat(12)}</span> · <span class="dsh-chatroom-progress-state">正在思考</span></strong>
      <span class="dsh-chatroom-progress-line">${'tool output with a deliberately-unbroken-long-value-'.repeat(8)}</span><small>30 秒无新进展，正在等待工具或模型</small>
    </div></section>
    <dialog class="dsh-chatroom-management-dialog"><header><h2>AI 成员与群管理：${'很长的房间名称'.repeat(9)}</h2><button>关闭</button></header><div class="dsh-chatroom-management-content"><button>保存</button></div></dialog>
    <dialog class="dsh-chatroom-image-viewer" open><header><strong>图片预览</strong><button>全部缩略图</button><a href="#">下载原图</a><button>关闭</button></header><div class="dsh-chatroom-gallery-stage"><img width="1800" height="1200" alt="media preview"></div><nav class="dsh-chatroom-gallery-navigation"><button>← 上一张</button><span>1 / 8</span><button>下一张 →</button></nav></dialog>`
  const management = required<HTMLDialogElement>('.dsh-chatroom-management-dialog')
  const viewer = required<HTMLDialogElement>('.dsh-chatroom-image-viewer')
  management.showModal()
  try {
    const managementBounds = management.getBoundingClientRect()
    expect(managementBounds.left).toBeGreaterThanOrEqual(11)
    expect(managementBounds.right).toBeLessThanOrEqual(width - 11)
    expect(managementBounds.bottom).toBeLessThanOrEqual(844)
    expect(management.scrollWidth).toBeLessThanOrEqual(management.clientWidth)
    expect(management.matches(':modal')).toBe(true)
    const progress = required<HTMLElement>('.dsh-chatroom-model-progress')
    expect(progress.scrollWidth).toBeLessThanOrEqual(progress.clientWidth)
    expect(getComputedStyle(required('.dsh-chatroom-progress-line')).overflowWrap).toBe('anywhere')
    const state = required<HTMLElement>('.dsh-chatroom-progress-state')
    expect(state.getBoundingClientRect().width).toBeGreaterThanOrEqual(state.scrollWidth)
    expect(management.contains(document.elementFromPoint(width / 2, 300))).toBe(true)
    const viewerBounds = viewer.getBoundingClientRect()
    expect(viewerBounds.left).toBeGreaterThanOrEqual(11)
    expect(viewerBounds.right).toBeLessThanOrEqual(width - 11)
    expect(viewerBounds.bottom).toBeLessThanOrEqual(844)
    expect(viewer.scrollWidth).toBeLessThanOrEqual(viewer.clientWidth)
    const close = viewer.querySelector('header button:last-child')!
    if (!(close instanceof HTMLElement)) throw new Error('Missing close button')
    close.focus()
    // Script focus intentionally does not force Chromium's keyboard-only
    // :focus-visible pseudo-class; retain the focus target without faking it.
    expect(document.activeElement?.textContent).toBe('关闭')
  } finally { management.close() }
})

it.each([320, 400])('keeps the progress state visible in a %ipx Files-side content pane', async width => {
  await page.viewport(1440, 844)
  const style = document.createElement('style')
  style.textContent = `body { margin: 0; } ${CHATROOM_STYLES}`
  document.head.append(style)
  document.body.innerHTML = `<aside style="width:${width}px"><section class="dsh-chatroom-model-progress"><div class="dsh-chatroom-progress-row">
    <i class="dsh-chatroom-progress-dot"></i><strong><span class="dsh-chatroom-progress-name">${'long-name-'.repeat(24)}</span> · <span class="dsh-chatroom-progress-state">正在执行</span></strong>
    <span class="dsh-chatroom-progress-line">${'long-tool-value-'.repeat(24)}</span><small>刚刚更新</small>
  </div></section></aside>`
  const pane = required<HTMLElement>('aside')
  const progress = required<HTMLElement>('.dsh-chatroom-model-progress')
  const name = required<HTMLElement>('.dsh-chatroom-progress-name')
  const state = required<HTMLElement>('.dsh-chatroom-progress-state')
  expect(progress.scrollWidth).toBeLessThanOrEqual(pane.clientWidth)
  expect(name.scrollWidth).toBeGreaterThan(name.clientWidth)
  expect(state.scrollWidth).toBeLessThanOrEqual(state.clientWidth)
  expect(state.textContent).toBe('正在执行')
})

it('compacts the QQ controls against a 320px center column between native sidebars', async () => {
  await page.viewport(924, 844)
  const style = document.createElement('style')
  style.textContent = `body { margin:0; } [data-slot] { display:contents; }
    .shell { display:grid; grid-template-columns:280px minmax(0, 320px) 324px; }
    .center { min-width:0; } .title,.native-actions,.composer-host { display:flex; min-width:0; }
    .utilities { position:absolute; right:0; } [data-slot="conversation.input.model"] { min-width:0; flex:1; }
    [data-slot="conversation.input.model"] button { display:flex; min-width:0; } ${CHATROOM_STYLES}${QQ2007_STYLES}`
  document.head.append(style)
  document.documentElement.dataset.dshChatroomInstalled = ''
  document.documentElement.dataset.dshChatroomStyle = 'qq2007'
  document.body.innerHTML = `<div data-slot="root"><div class="shell" data-details-collapsed="false">
    <div><div data-slot="sidebar">会话列表</div></div><div class="center"><div data-slot="conversation">
      <div data-slot="conversation.session.header"><header><div class="title"><div><nav>很长的群聊标题</nav>
        <div class="native-actions"><div data-slot="conversation.session.header.actions"><span class="dsh-chatroom-header-actions"><span class="dsh-chatroom-identity-action">管理员 · 1 人在线</span><button>AI 成员</button><button>群管理</button><button>会话图库</button></span></div></div></div>
        <div class="utilities"><div data-slot="conversation.session.header.utilities"><button><span>Session 日志</span>↓</button><label class="dsh-chatroom-style-switch"><span>风格</span><select aria-label="界面风格"><option>QQ2007</option></select></label></div></div></div></header></div>
      <div class="composer-host"><div data-slot="conversation.input.left">输入框</div><div data-slot="conversation.input.right"><button>＋</button><div data-slot="conversation.input.model"><button aria-label="模型：特别长的模型路由名称"><span>特别长的模型路由名称（应以省略号收纳）</span></button></div><button>⚙</button><button>↑</button></div></div>
    </div></div><div><div data-slot="details">Files</div></div></div></div>`
  const center = required<HTMLElement>('.center')
  const header = required<HTMLElement>('[data-slot="conversation.session.header"] > header')
  const modelButton = required<HTMLElement>('[data-slot="conversation.input.model"] button')
  expect(center.getBoundingClientRect().width).toBe(320)
  expect(header.scrollWidth).toBeLessThanOrEqual(center.clientWidth)
  expect(modelButton.getBoundingClientRect().right).toBeLessThanOrEqual(center.getBoundingClientRect().right)
  expect(required('[data-slot="conversation.input.model"] button').getAttribute('aria-label')).toContain('特别长的模型路由名称')
})

it('keeps the real slot-based QQ composer controls on one operable narrow-center row', async () => {
  await page.viewport(924, 844)
  const style = document.createElement('style')
  style.textContent = `body { margin:0; } [data-slot] { display:contents; }
    .shell { display:grid; grid-template-columns:280px minmax(0,320px) 324px; }
    .center { min-width:0; } .composer-card { width:290px; }
    .host-trailing { display:flex; flex:none; width:274px; margin-left:auto; gap:3px; }
    .dsh-chatroom-session-controls { display:flex; flex:0 0 auto; gap:5px; width:213px; }
    .dsh-chatroom-session-controls button { min-width:32px; height:28px; white-space:nowrap; }
    .host-context { display:inline-flex; }
    .host-context > button { width:28px; height:28px; padding:0; }
    .host-send { width:34px; height:34px; } .host-model { min-width:0; white-space:nowrap; }
    .host-model > span { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } ${CHATROOM_STYLES}${QQ2007_STYLES}`
  document.head.append(style)
  document.documentElement.dataset.dshChatroomInstalled = ''
  document.documentElement.dataset.dshChatroomStyle = 'qq2007'
  document.body.innerHTML = `<div data-slot="root"><div class="shell"><aside>Sessions</aside><div class="center"><div data-slot="conversation"><div class="composer-card"><div class="host-trailing"><div data-slot="conversation.input.right"><div class="dsh-chatroom-session-controls"><button>停止</button><button>新建会话</button><button>Quick Meeting</button></div></div><div data-slot="conversation.input.model"><button class="host-model" aria-label="模型：High 高上下文优先模型路由名称（应以省略号收纳）"><span>High 高上下文优先模型路由名称（应以省略号收纳）</span></button></div><span class="host-context"><button aria-label="上下文已用 6%" aria-haspopup="dialog">◌</button></span><button class="host-send" aria-label="发送">↑</button></div></div></div></div><aside>Files</aside></div></div>`
  const trailing = required<HTMLElement>('.host-trailing')
  const model = required<HTMLElement>('.host-model')
  const modelText = required<HTMLElement>('.host-model > span')
  const controls = [...trailing.querySelectorAll<HTMLElement>('button, output')]
  const sessionControls = required<HTMLElement>('.dsh-chatroom-session-controls')
  expect(getComputedStyle(trailing).display).toBe('flex')
  const trailingBox = trailing.getBoundingClientRect()
  for (const control of controls) {
    const box = control.getBoundingClientRect()
    expect(box.left).toBeGreaterThanOrEqual(trailingBox.left)
    expect(box.right).toBeLessThanOrEqual(trailingBox.right)
    // Centered controls may differ in height, but a wrapped second line would
    // no longer overlap the first control vertically.
    expect(box.top).toBeLessThan(trailingBox.bottom)
    expect(box.bottom).toBeGreaterThan(trailingBox.top)
  }
  expect(modelText.scrollWidth).toBeGreaterThan(modelText.clientWidth)
  expect(getComputedStyle(modelText).textOverflow).toBe('ellipsis')
  expect(model.getBoundingClientRect().width).toBeGreaterThanOrEqual(80)
  const modelBox = model.getBoundingClientRect()
  const modelHit = document.elementFromPoint(modelBox.left + modelBox.width / 2, modelBox.top + modelBox.height / 2)
  expect(modelHit === model || model.contains(modelHit)).toBe(true)
  expect(sessionControls.getBoundingClientRect().width).toBeGreaterThanOrEqual(212)
  expect(model.getAttribute('aria-label')).toContain('High')
  expect(required<HTMLButtonElement>('.host-context > button').getAttribute('aria-label')).toBe('上下文已用 6%')
})

it('keeps QQ workspace categories within the native scrollbar content box', async () => {
  await page.viewport(924, 844)
  const style = document.createElement('style')
  style.textContent = `body { margin:0; } .sidebar { width:280px; padding:0 5px; }
    .host-list { width:270px; height:96px; overflow-x:auto; overflow-y:scroll; }
    ${CHATROOM_STYLES}${QQ2007_STYLES}`
  document.head.append(style)
  document.documentElement.dataset.dshChatroomInstalled = ''
  document.documentElement.dataset.dshChatroomStyle = 'qq2007'
  document.body.innerHTML = `<div class="sidebar"><div class="host-list" data-dsh-chatroom-workspace-categories><div data-dsh-chatroom-category-header="group"><button>群聊</button></div><div style="height:150px"></div></div></div>`
  const list = required<HTMLElement>('[data-dsh-chatroom-workspace-categories]')
  expect(getComputedStyle(list).overflowX).toBe('auto')
  expect(getComputedStyle(list).scrollbarGutter).toBe('stable')
  expect(list.scrollWidth).toBeLessThanOrEqual(list.clientWidth)
})

it('keeps the native sidebar-open toggle hittable behind the QQ brand mark', async () => {
  await page.viewport(390, 844)
  const style = document.createElement('style')
  style.textContent = `body { margin:0; } .host-sidebar { position:relative; width:56px; height:100dvh; }
    .host-toggle { position:absolute; left:11px; top:18px; width:36px; height:36px; }
    [data-slot="sidebar.brand.mark"] { position:absolute; z-index:1; left:14px; top:20px; }
    ${CHATROOM_STYLES}${QQ2007_STYLES}`
  document.head.append(style)
  document.documentElement.dataset.dshChatroomInstalled = ''
  document.documentElement.dataset.dshChatroomStyle = 'qq2007'
  document.body.innerHTML = `<div class="host-sidebar"><button class="host-toggle" aria-label="打开侧边栏">打开侧边栏</button><div data-slot="sidebar.brand.mark"><span>Native mark</span></div></div>`
  const toggle = required<HTMLButtonElement>('button[aria-label="打开侧边栏"]')
  const box = toggle.getBoundingClientRect()
  const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
  expect(hit === toggle || toggle.contains(hit)).toBe(true)
})

it('gives assistant actions a full row inside the narrow native action rail', async () => {
  await page.viewport(924, 844)
  const style = document.createElement('style')
  style.textContent = `body { margin:0; } [data-slot] { display:contents; }
    .shell { display:grid; grid-template-columns:280px minmax(0,320px) 324px; }
    .center { min-width:0; } .native-root { display:flex; width:258px; }
    .host-actions { display:flex; width:258px; align-items:center; gap:4px; }
    .host-actions > time { flex:0 0 auto; } ${CHATROOM_STYLES}${QQ2007_STYLES}`
  document.head.append(style)
  document.documentElement.dataset.dshChatroomInstalled = ''
  document.documentElement.dataset.dshChatroomStyle = 'qq2007'
  document.body.innerHTML = `<div data-slot="root"><div class="shell"><aside>Sessions</aside><div class="center"><div data-slot="conversation"><article class="native-root"><div class="flow-item" data-chat-flow-kind="turn-tail"><div data-turn-tail="1"><div class="host-actions"><time>12:00</time><div data-slot="conversation.chat.assistant-actions"><div class="dsh-chatroom-assistant-tools"><div class="dsh-chatroom-assistant-actions"><div class="dsh-chatroom-message-actions">${['回复', '复制', '点赞', '分支', '转发'].map(name => `<button aria-label="${name}">↩<span class="dsh-chatroom-action-label">${name}</span></button>`).join('')}</div></div></div></div></div></div></div></article></div></div><aside>Files</aside></div></div>`
  const rail = required<HTMLElement>('.host-actions')
  const tools = required<HTMLElement>('.dsh-chatroom-assistant-tools')
  const actions = required<HTMLElement>('.dsh-chatroom-message-actions')
  expect(tools.getBoundingClientRect().width).toBeGreaterThan(200)
  expect(tools.getBoundingClientRect().right).toBeLessThanOrEqual(rail.getBoundingClientRect().right)
  expect(actions.getBoundingClientRect().height).toBeLessThanOrEqual(32)
  for (const action of actions.querySelectorAll<HTMLElement>('button')) {
    expect(action.getBoundingClientRect().width).toBeGreaterThan(16)
    expect(action.getBoundingClientRect().height).toBeLessThanOrEqual(32)
  }
})

it('does not apply the host userStack percentage cap twice in a QQ narrow center column', async () => {
  await page.viewport(924, 844)
  const style = document.createElement('style')
  style.textContent = `body { margin:0; } [data-slot] { display:contents; }
    .shell { display:grid; grid-template-columns:280px minmax(0,320px) 324px; }
    .center { min-width:0; } .dsh-chatroom-native-message > div { display:flex; width:205px; }
    .dsh-chatroom-native-message > div > div { width:70.2%; max-width:70.2%; }
    .host-bubble { display:block; max-width:100%; padding:10px 16px; box-sizing:border-box; overflow-wrap:anywhere; } ${CHATROOM_STYLES}${QQ2007_STYLES}`
  document.head.append(style)
  document.documentElement.dataset.dshChatroomInstalled = ''
  document.documentElement.dataset.dshChatroomStyle = 'qq2007'
  document.body.innerHTML = `<div data-slot="root"><div class="shell"><aside>Sessions</aside><div class="center"><div data-slot="conversation"><div class="dsh-chatroom-participant-message"><div class="dsh-chatroom-message-column"><div class="dsh-chatroom-native-message"><div class="host-user-row"><div class="host-user-stack"><div data-slot="conversation.message.images"></div><div class="host-bubble">${'long-json-value-'.repeat(8)}</div></div></div></div></div></div></div></div><aside>Files</aside></div></div>`
  const stack = required<HTMLElement>('.host-user-stack')
  const bubble = required<HTMLElement>('.host-bubble')
  expect(stack.getBoundingClientRect().width).toBeGreaterThanOrEqual(200)
  expect(bubble.getBoundingClientRect().width).toBeGreaterThanOrEqual(200)
  expect(bubble.getBoundingClientRect().height).toBeLessThanOrEqual(181)
})

it('does not keep the host userStack percentage cap on a QQ 320px text-only human bubble', async () => {
  await page.viewport(320, 720)
  const style = document.createElement('style')
  style.textContent = `body { margin:0; } [data-slot] { display:contents; }
    .shell { display:grid; grid-template-columns:56px minmax(0,1fr); width:320px; }
    .center { min-width:0; } .center .dsh-chatroom-participant-message { width:208px !important; margin-left:24px; }
    .center .dsh-chatroom-message-column { width:208px !important; max-width:none; }
    .center .dsh-chatroom-native-message > div { display:flex; width:208px; }
    .dsh-chatroom-native-message > div > div { width:70.2%; max-width:70.2%; }
    .host-bubble { display:block; max-width:100%; padding:10px 16px; box-sizing:border-box; overflow-wrap:anywhere; }
    ${CHATROOM_STYLES}${QQ2007_STYLES}`
  document.head.append(style)
  document.documentElement.dataset.dshChatroomInstalled = ''
  document.documentElement.dataset.dshChatroomStyle = 'qq2007'
  document.body.innerHTML = `<div data-slot="root"><div class="shell"><aside data-slot="sidebar">Sessions</aside><div class="center"><div data-slot="conversation"><div class="dsh-chatroom-participant-message"><div class="dsh-chatroom-message-column"><div class="dsh-chatroom-native-message"><div class="host-user-row"><div class="host-user-stack"><div class="host-bubble">${'long-text-only-human-message-'.repeat(10)}</div></div></div></div></div></div></div></div></div></div>`
  const conversation = required<HTMLElement>('.center')
  const stack = required<HTMLElement>('.host-user-stack')
  const bubble = required<HTMLElement>('.host-bubble')
  expect(conversation.getBoundingClientRect().width).toBe(264)
  expect(stack.getBoundingClientRect().width).toBeGreaterThanOrEqual(200)
  expect(bubble.getBoundingClientRect().width).toBeGreaterThanOrEqual(200)
  expect(bubble.getBoundingClientRect().right).toBeLessThanOrEqual(conversation.getBoundingClientRect().right)
  expect(bubble.scrollWidth).toBeLessThanOrEqual(bubble.clientWidth)
})

it.each([
  [320, false, 'single'], [320, true, 'single'], [320, false, 'end'], [320, true, 'end'],
  [924, false, 'single'], [924, true, 'single'], [924, false, 'end'], [924, true, 'end'],
] as const)('gives the QQ narrow transcript its full body width at %ipx (own=%s, group=%s)', async (width, own, group) => {
  await page.viewport(width, 844)
  const style = document.createElement('style')
  style.textContent = `body { margin:0; } [data-slot] { display:contents; }
    .shell { display:grid; grid-template-columns:${width === 320 ? '56px minmax(0,1fr)' : '280px 264px 380px'}; }
    .center { min-width:0; } .host-scroll { box-sizing:border-box; width:256px; padding-inline:24px; }
    .host-user-row { display:flex; width:100%; } .host-user-stack { width:70.2%; max-width:70.2%; }
    .host-bubble { max-width:100%; padding:10px 16px; box-sizing:border-box; overflow-wrap:anywhere; }
    ${CHATROOM_STYLES}${QQ2007_STYLES}`
  document.head.append(style)
  document.documentElement.dataset.dshChatroomInstalled = ''
  document.documentElement.dataset.dshChatroomStyle = 'qq2007'
  document.body.innerHTML = `<div data-slot="root"><div class="shell"><aside>Sessions</aside><div class="center"><div data-slot="conversation"><div class="host-scroll"><div class="dsh-chatroom-participant-message" data-dsh-chatroom-own="${own}" data-dsh-chatroom-group-position="${group}"><div class="dsh-chatroom-avatar">🐧</div><div class="dsh-chatroom-message-column"><div class="dsh-chatroom-display-name">${'参与者姓名'.repeat(8)}</div><div class="dsh-chatroom-native-message"><div class="host-user-row"><div class="host-user-stack"><div data-slot="conversation.message.images"></div><div class="host-bubble">${'中文长消息与-very-long-unbroken-value-'.repeat(8)}</div></div></div></div><div class="dsh-chatroom-message-actions"><button>回复</button><button>复制</button></div></div></div></div></div></div><aside>Files</aside></div></div>`
  const row = required<HTMLElement>('.dsh-chatroom-participant-message').getBoundingClientRect()
  const bubble = required<HTMLElement>('.host-bubble')
  const bodyBox = bubble.getBoundingClientRect()
  expect(row.width).toBe(208)
  expect(bodyBox.width).toBeGreaterThanOrEqual(200)
  expect(bodyBox.left).toBeGreaterThanOrEqual(row.left)
  expect(bodyBox.right).toBeLessThanOrEqual(row.right)
  expect(bubble.scrollWidth).toBeLessThanOrEqual(bubble.clientWidth)
  const avatar = required<HTMLElement>('.dsh-chatroom-avatar').getBoundingClientRect()
  const name = required<HTMLElement>('.dsh-chatroom-display-name').getBoundingClientRect()
  if (group === 'single') {
    expect(avatar.width).toBeGreaterThanOrEqual(32)
    expect(avatar.height).toBeGreaterThanOrEqual(32)
    expect(bodyBox.top).toBeGreaterThanOrEqual(avatar.bottom)
    expect(name.height).toBeGreaterThan(0)
    expect(name.bottom).toBeLessThanOrEqual(bodyBox.top)
    if (own) expect(name.right).toBeLessThanOrEqual(avatar.left)
    else expect(name.left).toBeGreaterThanOrEqual(avatar.right)
  } else {
    expect(avatar.height).toBe(0)
    expect(name.height).toBe(0)
    expect(bodyBox.top).toBe(row.top)
  }
  // Switching back preserves the native side-by-side participant layout.
  document.documentElement.dataset.dshChatroomStyle = 'default'
  expect(getComputedStyle(required<HTMLElement>('.dsh-chatroom-participant-message')).display).toBe('flex')
})

it.each([390, 768])('preserves chatroom footer and nested native Settings beside web-all mobile CSS at %ipx', async width => {
  await page.viewport(width, 844)
  document.documentElement.dataset.dshChatroomInstalled = ''
  const style = document.createElement('style')
  // Exact conflicting selectors from installed dsh-web-all RESPONSIVE_CSS.
  style.textContent = `body { margin:0; } [data-slot] { display:contents; }
    [data-pane="sidebar"] { width:56px; height:100dvh; }
    .host-sidebar { display:flex; flex-direction:column; height:100%; }
    .host-footer { display:flex; flex-direction:column; }
    .host-header { height:56px; } [role="dialog"] { position:fixed; inset:0; margin:auto; width:360px; height:420px; }
    ${CHATROOM_STYLES}${QQ2007_STYLES}
    @media(max-width:768px) {
      [data-dsh-frame][data-sidebar-collapsed] [data-pane="sidebar"] { pointer-events:none; }
      [data-dsh-frame][data-sidebar-collapsed] [data-pane="sidebar"] > [data-slot="sidebar"] > :first-child > :not(:first-child),
      [data-dsh-frame][data-sidebar-collapsed] [data-pane="sidebar"] > [data-slot="sidebar"] > :first-child > :first-child > :not([data-dsh-responsive-part="sidebar-toggle"]) { display:none !important; }
    }`
  document.head.append(style)
  document.body.innerHTML = `<div data-dsh-frame data-sidebar-collapsed><div data-pane="sidebar"><div data-slot="sidebar"><div class="host-sidebar"><div class="host-header"><button data-dsh-responsive-part="sidebar-toggle">展开</button></div><div class="unrelated-region">Hidden native region</div><div class="host-footer"><div><div data-slot="sidebar.footer.action"><div class="dsh-chatroom-server-status" data-wide="false"><button aria-label="重新连接服务器">↻</button></div></div></div><div><div data-slot="sidebar.settings"><div role="dialog"><div class="dsh-chatroom-settings"><button id="setting">设置字段</button></div></div></div></div></div></div></div></div></div>`
  const footer = required<HTMLElement>('.host-footer')
  const reconnect = required<HTMLButtonElement>('[aria-label="重新连接服务器"]')
  const settings = required<HTMLElement>('[role="dialog"]')
  expect(getComputedStyle(footer).display).toBe('flex')
  expect(getComputedStyle(reconnect).pointerEvents).toBe('auto')
  expect(footer.getBoundingClientRect().bottom).toBe(844)
  expect(settings.getBoundingClientRect().width).toBeGreaterThan(0)
  expect(settings.getBoundingClientRect().right).toBeLessThanOrEqual(width)
  expect(getComputedStyle(required('.unrelated-region')).display).toBe('none')
  settings.remove()
  const box = reconnect.getBoundingClientRect()
  expect(reconnect.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2))).toBe(true)
  // The compatibility layer cannot activate native Settings for a member.
  expect(document.querySelector('[role="dialog"]')).toBeNull()
})

it('keeps default-skin assistant action labels visible in a 320px center column', async () => {
  await page.viewport(924, 844)
  const style = document.createElement('style')
  style.textContent = `body { margin:0; } [data-slot] { display:contents; }
    .shell { display:grid; grid-template-columns:280px minmax(0,320px) 324px; }
    .center { min-width:0; } ${CHATROOM_STYLES}${QQ2007_STYLES}`
  document.head.append(style)
  document.documentElement.dataset.dshChatroomInstalled = ''
  document.body.innerHTML = `<div data-slot="root"><div class="shell"><aside>Sessions</aside><div class="center"><div data-slot="conversation"><div class="dsh-chatroom-assistant-actions"><button>↩<span class="dsh-chatroom-action-label">回复</span></button></div></div></div><aside>Files</aside></div></div>`
  const label = required<HTMLElement>('.dsh-chatroom-action-label')
  expect(getComputedStyle(label).display).not.toBe('none')
  expect(label.textContent).toBe('回复')
})

it.each(['展开底部面板', '折叠底部面板'])('reserves the native %s toggle hit area beside QQ style controls at 768px', async label => {
  await page.viewport(768, 900)
  const style = document.createElement('style')
  style.textContent = `body { margin:0; } [data-slot] { display:contents; }
    .host { position:relative; width:768px; } header > div:first-child { width:100%; }
    .toggle-cluster { position:absolute; z-index:45; top:14px; right:10px; width:60px; height:28px; }
    .toggle-cluster button { width:28px; height:28px; padding:0; }
    .toggle-cluster svg { width:100%; height:100%; } ${CHATROOM_STYLES}${QQ2007_STYLES}`
  document.head.append(style)
  document.documentElement.dataset.dshChatroomInstalled = ''
  document.documentElement.dataset.dshChatroomStyle = 'qq2007'
  document.body.innerHTML = `<div class="host"><div data-slot="conversation.session.header"><header><div class="title"><div><nav>全国可飞</nav><div data-slot="conversation.session.header.actions"></div></div><div class="utilities"><div data-slot="conversation.session.header.utilities"><button><span>Session 日志</span>↓</button><label class="dsh-chatroom-style-switch"><span>风格</span><select aria-label="界面风格"><option>QQ2007</option></select></label></div></div></div></header></div><div class="toggle-cluster"><button type="button" aria-label="${label}"><svg viewBox="0 0 10 10"><rect x="0" y="0" width="10" height="10" /></svg></button></div></div>`
  const select = required<HTMLSelectElement>('select[aria-label="界面风格"]')
  const toggle = required<HTMLButtonElement>(`button[aria-label="${label}"]`)
  const selectBox = select.getBoundingClientRect()
  const toggleBox = toggle.getBoundingClientRect()
  expect(selectBox.right).toBeLessThanOrEqual(toggleBox.left)
  const hit = document.elementFromPoint(selectBox.left + selectBox.width / 2, selectBox.top + selectBox.height / 2)
  expect(hit === select || select.contains(hit)).toBe(true)
  expect(document.elementFromPoint(toggleBox.left + toggleBox.width / 2, toggleBox.top + toggleBox.height / 2)).toBe(toggle.querySelector('rect'))
})

it.each(['展开侧边栏', '折叠侧边栏'])('reserves the native %s toggle hit area beside QQ style controls at 390px', async label => {
  await page.viewport(390, 844)
  const style = document.createElement('style')
  style.textContent = `body { margin:0; } [data-slot] { display:contents; }
    .host { position:relative; width:390px; } header > div:first-child { width:100%; }
    .toggle-cluster { position:absolute; z-index:45; top:14px; right:8px; width:32px; height:28px; }
    .toggle-cluster button { width:28px; height:28px; padding:0; }
    .toggle-cluster svg { width:100%; height:100%; } ${CHATROOM_STYLES}${QQ2007_STYLES}`
  document.head.append(style)
  document.documentElement.dataset.dshChatroomInstalled = ''
  document.documentElement.dataset.dshChatroomStyle = 'qq2007'
  document.body.innerHTML = `<div class="host"><div data-slot="conversation.session.header"><header><div class="title"><div><nav>全国可飞</nav><div data-slot="conversation.session.header.actions"></div></div><div class="utilities"><div data-slot="conversation.session.header.utilities"><button><span>Session 日志</span>↓</button><label class="dsh-chatroom-style-switch"><span>风格</span><select aria-label="界面风格"><option>QQ2007</option></select></label></div></div></div></header></div><div class="toggle-cluster"><button type="button" aria-label="${label}"><svg viewBox="0 0 10 10"><rect x="0" y="0" width="10" height="10" /></svg></button></div></div>`
  const select = required<HTMLSelectElement>('select[aria-label="界面风格"]')
  const toggle = required<HTMLButtonElement>(`button[aria-label="${label}"]`)
  const selectBox = select.getBoundingClientRect()
  const toggleBox = toggle.getBoundingClientRect()
  expect(selectBox.right).toBeLessThanOrEqual(toggleBox.left)
  const hit = document.elementFromPoint(selectBox.left + selectBox.width / 2, selectBox.top + selectBox.height / 2)
  expect(hit === select || select.contains(hit)).toBe(true)
  expect(document.elementFromPoint(toggleBox.left + toggleBox.width / 2, toggleBox.top + toggleBox.height / 2)).toBe(toggle.querySelector('rect'))
})

it('preserves compact direct-message space on a short phone viewport', async () => {
  await page.viewport(390, 390)
  const style = document.createElement('style')
  style.textContent = `body { margin: 0; } ${CHATROOM_STYLES}`
  document.head.append(style)
  document.body.innerHTML = `<section class="dsh-chatroom-direct-panel"><header>私聊</header>
    <div class="dsh-chatroom-direct-messages">${'<p>已有消息</p>'.repeat(24)}</div>
    <form class="dsh-chatroom-direct-composer"><textarea>草稿</textarea><div class="dsh-chatroom-direct-composer-tools"><button>附件</button><button>发送</button></div></form></section>`
  const messages = required<HTMLElement>('.dsh-chatroom-direct-messages')
  const composer = required<HTMLElement>('.dsh-chatroom-direct-composer')
  expect(parseFloat(getComputedStyle(messages).paddingBottom)).toBe(16)
  expect(messages.getBoundingClientRect().height).toBeGreaterThan(100)
  expect(composer.getBoundingClientRect().bottom).toBeLessThanOrEqual(390)
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390)
})

it.each(['default', 'qq2007'].flatMap(skin => [390, 768].map(width => ({ skin, width }))))(
  'keeps mobile navigation and native Settings above Files and the legacy scrim ($skin/$width)',
  async ({ skin, width }) => {
    await page.viewport(width, 844)
    const style = document.createElement('style')
    style.textContent = `body { margin:0 } [data-slot] { display:contents }
      .frame { position:relative; height:844px } .sidebar-root { display:flex; flex-direction:column; background:white }
      .collapse { position:absolute; top:8px; left:180px; width:44px; height:44px }
      .settings-overlay { position:fixed; inset:0; z-index:100; background:white }
      .setting-action { position:fixed; top:360px; left:80px; width:80px; height:44px }
      ${CHATROOM_STYLES}${QQ2007_STYLES}
      @media(max-width:768px) {
        [data-dsh-frame]:not([data-sidebar-collapsed])::after { content:''; position:fixed; inset:0; z-index:1050; background:#0004 }
        [data-dsh-frame] [data-pane="sidebar"] { position:absolute; z-index:1100 }
      }`
    document.head.append(style)
    document.documentElement.dataset.dshChatroomInstalled = ''
    if (skin === 'qq2007') document.documentElement.dataset.dshChatroomStyle = skin
    document.body.innerHTML = `<div data-slot="root"><div data-dsh-frame data-details-collapsed="false" class="frame">
      <div data-pane="sidebar"><div data-slot="sidebar"><div class="sidebar-root"><header><button class="collapse">收起</button></header><footer><div class="dsh-chatroom-server-status">连接正常</div><div data-slot="sidebar.settings"></div></footer></div></div></div>
      <div data-pane="conversation"><div data-slot="conversation"></div></div>
      <div data-pane="details"><div data-slot="details"><div style="position:absolute;inset:0;background:#eef">Files</div></div></div>
    </div></div><button class="dsh-chatroom-sidebar-backdrop">关闭导航</button>`
    const hit = (element: HTMLElement) => {
      const r = element.getBoundingClientRect()
      const target = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
      return target === element || element.contains(target)
    }
    expect(hit(required('.collapse'))).toBe(true)
    expect(hit(required('.dsh-chatroom-sidebar-backdrop'))).toBe(true)
    required('[data-dsh-frame]').setAttribute('data-sidebar-collapsed', 'true')
    required('[data-slot="sidebar.settings"]').innerHTML = '<div class="settings-overlay"><div role="dialog"><div class="dsh-chatroom-settings"><button class="setting-action">启用成员</button></div></div></div>'
    expect(hit(required('.setting-action'))).toBe(true)
    required('[data-slot="sidebar.settings"]').replaceChildren()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(required('[data-pane="details"]').getBoundingClientRect().width).toBeGreaterThan(0)
  },
)

function required<T extends Element = HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Missing fixture element: ${selector}`)
  return element
}
