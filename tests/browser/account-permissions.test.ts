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
  await page.viewport(1280, 720)
  document.head.replaceChildren()
  document.body.replaceChildren()
})

describe('member account settings in a real browser', () => {
  it.each([320, 390, 768, 1280])('keeps sign-out and role guidance usable at %ipx without administrative controls', async width => {
    await page.viewport(width, 844)
    const style = document.createElement('style')
    style.textContent = `${CHATROOM_STYLES} body { margin: 0; }`
    document.head.append(style)
    const container = document.createElement('main')
    document.body.append(container)
    const room = {
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
    const button = Array.from(container.querySelectorAll('button')).find(node => node.textContent === '退出登录')!
    expect(button).toBeDefined()
    expect(button.disabled).toBe(false)
    expect(button.getBoundingClientRect().width).toBeGreaterThan(0)
    expect(button.getBoundingClientRect().right).toBeLessThanOrEqual(width)
    expect(container.scrollWidth).toBeLessThanOrEqual(width)
    expect(container.textContent).toContain('平台成员')
    expect(container.querySelector('[aria-label="AI 自动响应设置"]')).toBeNull()
    expect(container.querySelector('[aria-label="系统管理"]')).toBeNull()
    expect(container.textContent).not.toContain('private-policy')
    button.click()
    await expect.poll(() => logout.mock.calls.length).toBe(1)
  })
})
