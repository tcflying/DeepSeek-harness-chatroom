import { afterEach, describe, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { ChatroomSettingsSection, ChatroomAccountPanels } from '../../src/client/ChatroomAccountPanels.js'
import { CHATROOM_STYLES } from '../../src/client/styles.js'
import type { ChatroomView } from '../../src/client/store.js'
import { watchAdminControls } from '../../src/client/admin-access.js'

let root: Root | undefined
afterEach(async () => {
  root?.unmount()
  root = undefined
  await page.viewport(1280, 720)
  document.head.replaceChildren()
  document.body.replaceChildren()
})

describe('member account settings in a real browser', () => {
  it('keeps the entire server label visible beside reconnect, above the account action', () => {
    const style=document.createElement('style');style.textContent=CHATROOM_STYLES;document.head.append(style)
    document.body.innerHTML='<div style="width:248px;display:flex"><div data-slot="sidebar.footer.action" style="display:contents"><div class="dsh-chatroom-server-status" data-wide="true"><span role="status"><span class="dsh-chatroom-server-dot"></span><span class="dsh-chatroom-server-label">服务器已连接</span></span><button>↻ 重连</button></div><button class="dsh-chatroom-personal-account">我的账号</button></div></div>'
    const status=document.querySelector('.dsh-chatroom-server-status')!
    const account=document.querySelector('.dsh-chatroom-personal-account')!
    const label=document.querySelector('.dsh-chatroom-server-label')!
    expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth)
    expect(account.getBoundingClientRect().top).toBeGreaterThanOrEqual(status.getBoundingClientRect().bottom)
  })
  it('hides native access selectors for members and restores admin/unloaded state without timers', () => {
    const style = document.createElement('style')
    style.textContent = CHATROOM_STYLES
    document.head.append(style)
    const buttons = ['访问模式，当前：工作区内修改', 'Access mode, current: Workspace write', '发送表情'].map(label => {
      const button = document.createElement('button'); button.setAttribute('aria-label', label)
      document.body.append(button); return button
    })
    let value = { phase: 'ready', auth: { enabled: true, authenticated: true, account: { role: 'member', status: 'active' } } } as ChatroomView
    const listeners = new Set<() => void>()
    const stop = watchAdminControls({ getSnapshot: () => value, subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener) } } }, document.documentElement)
    expect(buttons.slice(0, 2).every(button => getComputedStyle(button).display === 'none')).toBe(true)
    expect(getComputedStyle(buttons[2]!).display).not.toBe('none')
    value = { ...value, auth: { ...value.auth, account: { ...value.auth.account!, role: 'super-admin' } } }
    listeners.forEach(listener => listener())
    expect(buttons.every(button => getComputedStyle(button).display !== 'none')).toBe(true)
    value = { ...value, phase: 'loading' }; listeners.forEach(listener => listener())
    expect(getComputedStyle(buttons[0]!).display).toBe('none')
    stop()
    expect(document.documentElement.hasAttribute('data-dsh-chatroom-restricted')).toBe(false)
    expect(listeners.size).toBe(0)
  })
  it.each([320, 390, 768, 1280])('keeps sign-out and role guidance usable at %ipx without administrative controls', async width => {
    await page.viewport(width, 844)
    const style = document.createElement('style')
    style.textContent = `${CHATROOM_STYLES} body { margin: 0; }`
    document.head.append(style)
    const container = document.createElement('main')
    document.body.append(container)
    const room = {
      phase: 'ready', accountOpen: true,
      auth: { enabled: true, authenticated: true, canManageSettings: false, account: {
        participantId: 'member', username: 'member', displayName: '普通群聊成员', role: 'member', status: 'active', passwordManaged: false,
      } }, manageableRooms: [],
      // A stale admin response must not reveal controls when the current account is a member.
      automationOverview: { canManage: true, mainAgentPrompt: 'private-policy', models: [] },
      wecomAuthorization: { enabled: false, status: 'unauthorized' },
    } as unknown as ChatroomView
    const logout = vi.fn(async () => undefined)
    const props = { useChatroom: (selector: (value: ChatroomView) => unknown) => selector(room), logout,
      openAdmin: vi.fn(async () => undefined) } as unknown as Parameters<typeof ChatroomSettingsSection>[0]
    root = createRoot(container)
    flushSync(() => root!.render(createElement(ChatroomSettingsSection, props)))
    expect(container.textContent).toBe('')
    flushSync(() => root!.render(createElement(ChatroomAccountPanels, { ...props, room, closeAccount: vi.fn() })))
    const dialog = document.querySelector<HTMLDialogElement>('dialog')!
    expect(dialog.matches(':modal')).toBe(true)
    const button = Array.from(dialog.querySelectorAll('button')).find(node => node.textContent === '退出登录')!
    expect(button).toBeDefined()
    expect(button.disabled).toBe(false)
    expect(button.getBoundingClientRect().width).toBeGreaterThan(0)
    expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44)
    expect(parseFloat(getComputedStyle(dialog.querySelector('.dsh-chatroom-panel-status')!).paddingTop)).toBe(0)
    expect(button.getBoundingClientRect().right).toBeLessThanOrEqual(width)
    expect(dialog.scrollWidth).toBeLessThanOrEqual(width)
    expect(dialog.textContent).toContain('平台成员')
    expect(dialog.querySelector('[aria-label="AI 自动响应设置"]')).toBeNull()
    expect(dialog.querySelector('[aria-label="系统管理"]')).toBeNull()
    expect(dialog.textContent).not.toContain('private-policy')
    button.click()
    await expect.poll(() => logout.mock.calls.length).toBe(1)
  })
})
