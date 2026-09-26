import { afterEach, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { CHATROOM_STYLES } from '../../src/client/styles.js'
import { QQ2007_STYLES } from '../../src/client/qq2007-styles.js'

afterEach(() => {
  document.body.replaceChildren()
  document.head.querySelectorAll('[data-shell-test]').forEach(e => e.remove())
  document.documentElement.removeAttribute('data-dsh-chatroom-installed')
  document.documentElement.removeAttribute('data-dsh-chatroom-style')
})

it('keeps the reconnect control inside the native footer in both skins and rail widths', async () => {
  const style = document.createElement('style')
  style.dataset.shellTest = ''
  style.textContent = 'body{margin:0}[data-slot]{display:contents}.sidebar{display:flex;flex-direction:column;box-sizing:border-box;height:100dvh;padding:6px 10px}.spacer{flex:1;min-height:0}.footer{display:flex;flex:none;justify-content:center}' + CHATROOM_STYLES + QQ2007_STYLES
  document.head.append(style)
  document.documentElement.dataset.dshChatroomInstalled = ''
  for (const skin of ['default', 'qq2007']) {
    document.documentElement.dataset.dshChatroomStyle = skin
    for (const width of [320, 390, 768, 926, 1440]) {
      await page.viewport(width, 720)
      for (const wide of [false, true]) {
        document.body.innerHTML = `<div class="sidebar" style="width:${wide ? 280 : 56}px"><div class="spacer"></div><button>设置</button><div class="footer"><div data-slot="sidebar.footer.action"><div class="dsh-chatroom-server-status" data-wide="${wide}" data-state="connected"><span role="status"><span class="dsh-chatroom-server-dot"></span><span class="dsh-chatroom-server-label">服务器已连接</span></span><button><span>↻</span><span class="dsh-chatroom-reconnect-label">重连</span></button></div></div></div></div>`
        const control = document.querySelector('.dsh-chatroom-server-status button')!
        const r = control.getBoundingClientRect()
        expect(r.left).toBeGreaterThanOrEqual(0)
        expect(r.right).toBeLessThanOrEqual(wide ? 280 : 56)
        expect(r.bottom).toBeLessThanOrEqual(720)
        expect(r.bottom).toBeGreaterThan(690)
        expect(r.width).toBeGreaterThanOrEqual(44)
        if (!wide || width <= 900) expect(r.height).toBeGreaterThanOrEqual(44)
      }
    }
  }
})

it('keeps reconnect and neighboring Host actions hittable in the collapsed multi-plugin footer', async () => {
  const style = document.createElement('style')
  style.dataset.shellTest = ''
  // Pinned Host structure: display:contents action slot inside a centered row.
  style.textContent = `body{margin:0}[data-slot]{display:contents}.sidebar{display:flex;flex-direction:column;box-sizing:border-box;width:55.2px;height:100dvh;padding:18px 10px 6px}.spacer{flex:1}.foot{display:flex;flex-direction:column;align-items:center}.actions{display:flex;justify-content:center;align-items:center;gap:8px;width:auto}.host-action{flex:none;width:36px;height:36px;padding:0}` + CHATROOM_STYLES + QQ2007_STYLES
  document.head.append(style)
  document.documentElement.dataset.dshChatroomInstalled = ''
  for (const skin of ['default', 'qq2007']) {
    document.documentElement.dataset.dshChatroomStyle = skin
    for (const width of [320, 390, 768, 926, 1440]) {
      await page.viewport(width, 720)
      document.body.innerHTML = `<div data-slot="sidebar"><div class="sidebar"><div class="spacer"></div><div class="foot"><div class="actions"><div data-slot="sidebar.footer.action"><div class="dsh-chatroom-server-status" data-wide="false"><span role="status"><span class="dsh-chatroom-server-dot"></span><span class="dsh-chatroom-server-label">目录同步超时 · 请重连</span></span><button aria-label="重新连接服务器"><span>↻</span><span class="dsh-chatroom-reconnect-label">重连</span></button></div><button class="host-action">更新</button><button class="host-action">远程</button></div></div><button class="host-action">账号</button></div></div></div>`
      let clicks = 0
      const reconnect = document.querySelector('.dsh-chatroom-server-status button')!
      reconnect.addEventListener('click', () => { clicks++ })
      for (const control of document.querySelectorAll('button')) {
        const r = control.getBoundingClientRect()
        expect(r.left, `${skin}/${width} ${control.textContent}`).toBeGreaterThanOrEqual(0)
        expect(r.right).toBeLessThanOrEqual(56)
        expect(r.bottom).toBeLessThanOrEqual(720)
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
        expect(hit === control || control.contains(hit)).toBe(true)
      }
      await page.getByRole('button', { name: '重新连接服务器', exact: true }).click()
      expect(clicks).toBe(1)
    }
  }
})

it('keeps chat width with an open mobile drawer and restores native branding', async () => {
  const style = document.createElement('style')
  style.dataset.shellTest = ''
  style.textContent = `body{margin:0} [data-slot]{display:contents} .frame{display:grid;height:100dvh;grid-template-columns:280px minmax(0,1fr) 0} .sidebar{width:280px;height:100%} .center{min-width:0} .brand{display:flex;gap:10px} .tools{display:flex} .title{display:flex} .native-actions{display:flex;flex:0 0 auto} .utilities{position:absolute;right:0} button,select{box-sizing:border-box} ` + CHATROOM_STYLES + QQ2007_STYLES
  document.head.append(style)
  document.documentElement.dataset.dshChatroomInstalled = ''
  document.documentElement.dataset.dshChatroomStyle = 'qq2007'
  document.body.innerHTML = `<div data-slot="root"><div class="frame"><div><div data-slot="sidebar"><div class="sidebar"><button class="brand"><span data-slot="sidebar.brand.mark"><svg width="24" height="24"></svg></span><span data-slot="sidebar.brand.name"><span>DeepSeek</span></span></button></div></div></div><div class="center"><div data-slot="conversation"><div data-slot="conversation.session.header"><header><div class="title"><div><nav>这是一个很长的群聊名字</nav><div class="native-actions"><div data-slot="conversation.session.header.actions"><span class="dsh-chatroom-header-actions"><span class="dsh-chatroom-identity-action">本机管理员 · 1 人在线</span><details class="dsh-chatroom-agent-roster"><summary>Agent 3</summary><div class="dsh-chatroom-agent-roster-menu"><button>打开 Agent</button><small>直接续聊；不会替换群聊。</small></div></details><button>AI 成员</button><button>群管理</button></span></div></div></div><div class="utilities"><div data-slot="conversation.session.header.utilities"><button aria-label="Session 日志"><span>Session 日志</span>↓</button><label class="dsh-chatroom-style-switch">风格<select><option>QQ2007</option></select></label></div></div></div><div role="tablist"><button role="tab">对话</button><button role="tab">轨迹</button></div></header></div><div class="dsh-chatroom-human-bubble">正文与中文测试，长网址 https://example.test/${'long'.repeat(30)}</div><div contenteditable="true">验收草稿</div></div></div><div></div></div></div><button class="dsh-chatroom-sidebar-backdrop">关闭会话列表</button>`
  const frame = document.querySelector('.frame')!
  const details = document.createElement('div')
  details.innerHTML = '<div data-slot="details"><button>关闭详情</button></div>'
  frame.lastElementChild!.replaceWith(details)
  frame.setAttribute('data-details-collapsed', 'true')
  const center = document.querySelector('.center')!
  const logo = document.querySelector('[data-slot="sidebar.brand.mark"]')!
  expect(getComputedStyle(logo, '::before').backgroundImage).toContain('data:image/png')
  expect(getComputedStyle(logo.firstElementChild!).display).toBe('none')
  expect(getComputedStyle(document.querySelector('[data-slot="sidebar.brand.name"]')!, '::before').content).toBe('"QQ"')
  for (const width of [320, 390, 540, 768, 900, 926, 1440, 1920]) {
    await page.viewport(width, 844)
    for (const collapsed of [false, true]) {
      frame.toggleAttribute('data-sidebar-collapsed', collapsed)
      if (collapsed) frame.setAttribute('data-sidebar-collapsed', 'true')
      const r = center.getBoundingClientRect()
      expect(r.width, `chat width ${width} collapsed=${collapsed}`).toBeGreaterThanOrEqual(width - (width <= 900 ? 56 : 280))
      expect(getComputedStyle(document.querySelector('.dsh-chatroom-sidebar-backdrop')!).display).toBe(width <= 900 && !collapsed ? 'block' : 'none')
      if (width <= 900 && !collapsed) {
        const b = document.querySelector('.dsh-chatroom-sidebar-backdrop')!
        const r = b.getBoundingClientRect()
        expect(document.elementFromPoint(r.x + r.width / 2, 300)).toBe(b)
        expect(r.left).toBeGreaterThanOrEqual(document.querySelector('.sidebar')!.getBoundingClientRect().right)
      }
      const h = document.querySelector('header')!.getBoundingClientRect()
      expect(h.height, `header height ${width}`).toBeLessThan(width <= 540 ? 185 : 150)
      const controls = [...document.querySelectorAll('header button,header select,header summary')].filter(e=>e.getBoundingClientRect().width>0).map(e=>e.getBoundingClientRect())
      expect(controls.every(r=>r.left>=0 && r.right<=width+1), `controls ${width}`).toBe(true)
      expect(getComputedStyle(document.querySelector('.dsh-chatroom-human-bubble')!).fontSize).toBe('16px')
      expect(getComputedStyle(document.querySelector('[contenteditable]')!).fontSize).toBe('16px')
      if (width <= 900) {
        expect(details.getBoundingClientRect().width).toBe(0)
        frame.removeAttribute('data-details-collapsed')
        expect(details.getBoundingClientRect().width).toBe(width - 56)
        frame.setAttribute('data-details-collapsed', 'true')
      }
    }
  }
  document.documentElement.removeAttribute('data-dsh-chatroom-style')
  expect(getComputedStyle(logo.firstElementChild!).display).not.toBe('none')
  expect(getComputedStyle(logo,'::before').backgroundImage).toBe('none')
  expect(document.querySelector('[contenteditable]')!.textContent).toBe('验收草稿')
})

it('fits mobile member forms and gives all native settings sections a full-width content area', async () => {
  const style = document.createElement('style')
  style.dataset.shellTest = ''
  style.textContent = `body{margin:0} [data-slot]{display:contents} [role=dialog]{display:flex;width:800px;height:600px} nav{width:188px;flex-shrink:0} nav>div{display:flex;flex-direction:column} .content{min-width:0;flex:1} ` + CHATROOM_STYLES + QQ2007_STYLES
  document.head.append(style)
  document.documentElement.dataset.dshChatroomInstalled = ''
  for (const skin of ['default','qq2007']) {
    document.documentElement.dataset.dshChatroomStyle = skin
    for (const width of [320,390,540]) {
      await page.viewport(width,844)
      document.body.innerHTML = `<aside class="dsh-chatroom-member-card"><form class="dsh-chatroom-manage-title"><label>名称<input value="长名称测试"></label><label>模型<select><option>OC GPT-6 extra-long provider / model label</option></select></label><details><summary>高级配置</summary><textarea></textarea></details><button>添加 AI 成员</button></form></aside>`
      const panel = document.querySelector('aside')!
      expect(panel.scrollWidth, `member overflow ${skin} ${width}`).toBeLessThanOrEqual(panel.clientWidth)
      document.body.innerHTML = `<section role="dialog"><nav><div><button>通用设置</button><button>模型</button><button>插件</button><button>群聊与账号</button></div></nav><div class="content"><div><div data-slot="settings.section"><div data-slot="settings.general.item"><div>权限选择</div></div></div></div></div></section>`
      expect(document.querySelector('.content')!.getBoundingClientRect().width).toBeGreaterThan(width - 24)
      expect(document.querySelector('nav')!.getBoundingClientRect().height).toBeLessThanOrEqual(104)
      document.body.innerHTML = `<div style="position:absolute;left:176px;bottom:144px"><div class="dsh-chatroom-emoji-picker" role="dialog">${'<button>😀</button>'.repeat(80)}</div></div>`
      const picker = document.querySelector('.dsh-chatroom-emoji-picker')!.getBoundingClientRect()
      expect(picker.left).toBeGreaterThanOrEqual(0)
      expect(picker.right).toBeLessThanOrEqual(width)
      expect(picker.height).toBeLessThanOrEqual(280)
    }
  }
})
