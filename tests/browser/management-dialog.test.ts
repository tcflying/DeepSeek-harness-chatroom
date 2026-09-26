import { afterEach, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { CHATROOM_STYLES } from '../../src/client/styles.js'
import { QQ2007_STYLES } from '../../src/client/qq2007-styles.js'
afterEach(() => { document.body.replaceChildren(); document.head.querySelector('[data-management-test]')?.remove(); document.documentElement.removeAttribute('data-dsh-chatroom-style') })
it('keeps real AI form labels and switch text above the add button at desktop and phone widths', async () => {
  const sheet = document.createElement('style'); sheet.dataset.managementTest = ''; sheet.textContent = CHATROOM_STYLES + QQ2007_STYLES; document.head.append(sheet)
  document.body.innerHTML = `<dialog class="dsh-chatroom-management-dialog"><header><h2>AI 成员</h2><button>关闭</button></header><div class="dsh-chatroom-management-content"><div class="dsh-chatroom-member-card"><form class="dsh-chatroom-manage-title dsh-chatroom-agent-editor"><details class="dsh-chatroom-agent-avatar-picker"><summary>更换 AI 头像</summary></details><label>名称<input value="测试"></label><label>职责<input value="评审"></label><details class="dsh-chatroom-settings-advanced"><summary>高级配置</summary></details><label>模型<select><option>OpenCodex model with a long provider title</option></select></label><label>推理强度<select><option>默认</option></select></label><label class="dsh-chatroom-agent-enabled"><span class="dsh-chatroom-switch"><input type="checkbox" checked><span></span></span><span>启用成员</span></label><button class="dsh-chatroom-agent-add">添加 AI 成员</button></form></div></div></dialog>`
  const dialog = document.querySelector('dialog')!; dialog.showModal()
  document.documentElement.setAttribute('data-dsh-chatroom-installed', '')
  try {
    for (const skin of ['native', 'qq2007']) for (const width of [320, 390, 926, 1440]) {
      document.documentElement.dataset.dshChatroomStyle = skin
      await page.viewport(width, 844)
      const enabled = dialog.querySelector('.dsh-chatroom-agent-enabled')!, label = enabled.lastElementChild!.getBoundingClientRect(), add = dialog.querySelector('.dsh-chatroom-agent-add')!.getBoundingClientRect()
      expect(label.bottom).toBeLessThan(add.top)
      expect(enabled.getBoundingClientRect().height).toBeGreaterThanOrEqual(44)
      for (const field of dialog.querySelectorAll('input:not([type=checkbox]),select')) {
        expect(field.getBoundingClientRect().height).toBeGreaterThanOrEqual(42)
        expect(parseFloat(getComputedStyle(field).fontSize)).toBeGreaterThanOrEqual(16)
      }
      expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth)
    }
  } finally { document.documentElement.removeAttribute('data-dsh-chatroom-installed'); dialog.close() }
})
it('keeps both management dialogs in the top layer above a high-z-index Files sidebar', async () => {
  const sheet = document.createElement('style'); sheet.dataset.managementTest = ''; sheet.textContent = CHATROOM_STYLES + QQ2007_STYLES; document.head.append(sheet)
  for (const title of ['AI 成员', '群管理']) {
    document.body.innerHTML = `<aside style="position:fixed;inset:0 0 0 50%;z-index:2147483647;background:white">Files</aside><dialog class="dsh-chatroom-management-dialog" role="dialog"><header><h2>${title}</h2><button>关闭</button></header><div class="dsh-chatroom-management-content"><div class="dsh-chatroom-member-card"><form class="dsh-chatroom-manage-title"><label>名称<input value="测试"></label><label>模型<select><option>long-provider-model-label-012345678901234567890123456789</option></select></label><button>添加</button></form>${'<p>可滚动成员列表</p>'.repeat(24)}</div></div></dialog>`
    const dialog = document.querySelector('dialog')!; dialog.showModal()
    for (const skin of ['native', 'qq2007']) for (const width of [320, 390, 926, 1440]) {
      document.documentElement.dataset.dshChatroomStyle = skin
      await page.viewport(width, 844)
      const bounds = dialog.getBoundingClientRect(), close = dialog.querySelector('button')!.getBoundingClientRect()
      expect(bounds.left).toBeGreaterThanOrEqual(11); expect(bounds.right).toBeLessThanOrEqual(width - 11)
      expect(bounds.top).toBeGreaterThanOrEqual(11); expect(bounds.bottom).toBeLessThanOrEqual(833)
      expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth)
      expect(close.height).toBeGreaterThanOrEqual(44)
      expect(dialog.contains(document.elementFromPoint(close.x + close.width / 2, close.y + close.height / 2))).toBe(true)
      expect(dialog.matches(':modal')).toBe(true)
    }
    dialog.close()
  }
})
