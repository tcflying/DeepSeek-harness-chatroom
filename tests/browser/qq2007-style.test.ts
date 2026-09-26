import { afterEach, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { CHATROOM_STYLES } from '../../src/client/styles.js'
import { QQ2007_STYLES } from '../../src/client/qq2007-styles.js'

afterEach(() => {
  document.body.replaceChildren()
  document.head.querySelectorAll('[data-qq-test]').forEach(e => e.remove())
  document.documentElement.removeAttribute('data-dsh-chatroom-style')
  document.documentElement.removeAttribute('data-dsh-chatroom-installed')
})

it('skins native header, menus, settings, inputs and sidebar, with a clean default rollback', async () => {
  const sheet = document.createElement('style')
  sheet.dataset.qqTest = ''
  sheet.textContent = `body {margin:0;--dsw-alias-label-primary:#eee;--dsw-specific-sidebar-fill:#111;} .title {display:flex;} .cluster {display:flex;flex-direction:column;} .native-actions {display:flex;flex:0 0 auto;} [data-slot] {display:contents;} .utilities {position:absolute;right:0;} ` + CHATROOM_STYLES + QQ2007_STYLES
  document.head.append(sheet)
  document.documentElement.setAttribute('data-dsh-chatroom-installed', '')
  document.body.innerHTML = `<aside style="background:var(--dsw-specific-sidebar-fill)">好友列表</aside><div data-slot="conversation.session.header"><header><div class="title"><div class="cluster"><nav>项目群</nav><span class="dsh-chatroom-header-actions"><button class="dsh-chatroom-manage-action">AI 成员</button><button class="dsh-chatroom-manage-action">群管理</button></span></div><div class="utilities"><div data-slot="conversation.session.header.utilities"><button>Session 日志</button><label class="dsh-chatroom-style-switch">风格 <select><option>QQ2007</option></select></label></div></div></div><div role="tablist"><button role="tab" aria-selected="true">对话</button></div></header></div><div role="dialog"><div class="dsh-chatroom-settings"><input value="草稿保留"><button>保存</button></div></div><div role="menu">菜单</div>`
  const sidebar = document.querySelector('aside')!
  // Mirror the pinned host's non-shrinking native action wrapper, which the plugin must constrain.
  const pluginActions = document.querySelector('.dsh-chatroom-header-actions')!
  const nativeActions = document.createElement('div')
  nativeActions.className = 'native-actions'
  const actionSlot = document.createElement('div')
  actionSlot.dataset.slot = 'conversation.session.header.actions'
  pluginActions.before(nativeActions)
  nativeActions.append(actionSlot)
  actionSlot.append(pluginActions)
  pluginActions.insertAdjacentHTML('afterbegin', '<span class="dsh-chatroom-identity-action">本机管理员 · 1 人在线</span><span class="dsh-chatroom-agent-roster"><span>Agent 1</span><span class="dsh-chatroom-manage-action">DeepSeek · 主 Agent</span><button>刷新 Agent 列表</button><small>子 Agent 点按钮直接续聊；@ 会话引用不会唤起它。</small></span>')
  const before = getComputedStyle(sidebar).backgroundColor
  document.documentElement.dataset.dshChatroomStyle = 'qq2007'
  expect(getComputedStyle(sidebar).backgroundColor).toBe('rgb(233, 244, 255)')
  expect(getComputedStyle(document.querySelector('header')!).backgroundImage).toContain('linear-gradient')
  expect(getComputedStyle(document.querySelector('[role="menu"]')!).backgroundColor).toBe('rgb(244, 250, 255)')
  expect(getComputedStyle(document.querySelector('input')!).color).toBe('rgb(23, 58, 97)')
  for (const style of ['qq2007', 'default']) {
    if (style === 'default') document.documentElement.removeAttribute('data-dsh-chatroom-style')
    for (const width of [320, 390, 768, 926, 1440]) {
    await page.viewport(width, 800)
    const controls = [...document.querySelectorAll('header button,header select')].map(e => e.getBoundingClientRect())
    expect(controls.every(r => r.left >= 0 && r.right <= width), JSON.stringify({style,width,controls:controls.map(r=>({x:r.x,y:r.y,w:r.width,h:r.height}))})).toBe(true)
    const actions = document.querySelector('.dsh-chatroom-header-actions')!.getBoundingClientRect()
    const utilities = document.querySelector('.utilities')!.getBoundingClientRect()
    expect(actions.right <= utilities.left || actions.bottom <= utilities.top || utilities.bottom <= actions.top).toBe(true)
    for (let i = 0; i < controls.length; i++) for (let j = i + 1; j < controls.length; j++) {
      const a = controls[i]!, b = controls[j]!
      expect(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top).toBe(true)
    }
    }
  }
  document.documentElement.removeAttribute('data-dsh-chatroom-style')
  expect(getComputedStyle(sidebar).backgroundColor).toBe(before)
  expect((document.querySelector('input') as HTMLInputElement).value).toBe('草稿保留')
})
