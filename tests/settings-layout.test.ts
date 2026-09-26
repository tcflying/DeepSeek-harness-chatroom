// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatroomSettingsSection, ChatroomAccountPanels, type ChatroomAccountPanelProps } from '../src/client/ChatroomAccountPanels.js'
import type { ChatroomView } from '../src/client/store.js'

afterEach(() => cleanup())

function view(patch: Partial<ChatroomView> = {}): ChatroomView {
  return {
    phase: 'ready', accountOpen: true,
    auth: { enabled: true, authenticated: true, canManageSettings: true, providers: [], allowSelfRegistration: true, bootstrapRequired: false,
      account: { participantId: 'root', username: 'root', displayName: 'Root', avatarId: 'whale', role: 'super-admin', status: 'active', createdAt: 1 } },
    manageableRooms: [], automationBusy: false, automationError: undefined,
    automationOverview: {
      canManage: true, provider: 'deepseek', model: 'chat', meetingSummaryProvider: 'deepseek', meetingSummaryModel: 'chat',
      mainAgentPrompt: '主提示词', controllerPrompt: '判断提示词',
      models: [
        { provider: 'deepseek', model: 'chat', label: 'DeepSeek · Chat', reasoningEfforts: [] },
        { provider: 'deepseek', model: 'reasoner', label: 'DeepSeek · Reasoner', reasoningEfforts: [] },
      ],
    },
    ...patch,
  } as ChatroomView
}

function renderSettings(room: ChatroomView, saveAutomation = vi.fn(async () => true), extras: Record<string, unknown> = {}, personal = false): void {
  const props = {
    useChatroom: (selector: (snapshot: ChatroomView) => unknown) => selector(room),
    closeAccount: vi.fn(), changePassword: vi.fn(async () => true), closeAdmin: vi.fn(), openAdmin: vi.fn(async () => undefined),
    adminCreateUser: vi.fn(async () => true), adminUpdateUser: vi.fn(async () => true), adminSetSelfRegistration: vi.fn(async () => true),
    adminSetAutoRedirectProvider: vi.fn(async () => true), adminSaveProvider: vi.fn(async () => true), adminDeleteProvider: vi.fn(async () => true),
    openDirect: vi.fn(async () => undefined), closeDirect: vi.fn(), sendDirect: vi.fn(async () => true), closeWecomAuthorization: vi.fn(), saveAutomation,
    logout: vi.fn(async () => undefined), ...extras,
  } as unknown as Parameters<typeof ChatroomSettingsSection>[0]
  render(personal ? createElement(ChatroomAccountPanels, { ...props, room }) : createElement(ChatroomSettingsSection, props))
}

describe('ChatroomSettingsSection', () => {
  it('discards unsubmitted password fields when the settings panel switches accounts', () => {
    const alice = { participantId: 'alice', username: 'alice', displayName: 'Alice', avatarId: 'whale' as const,
      role: 'member' as const, status: 'active' as const, createdAt: 1 }
    let snapshot = view({ auth: { ...view().auth, canManageSettings: false, account: alice } })
    const props = { closeAccount: vi.fn() } as unknown as ChatroomAccountPanelProps
    const rendered = render(createElement(ChatroomAccountPanels, { ...props, room: snapshot }))
    fireEvent.change(screen.getByLabelText('当前密码'), { target: { value: 'alice-private-password' } })
    fireEvent.change(screen.getByLabelText('新密码'), { target: { value: 'new-private-password' } })
    snapshot = view({ auth: { ...snapshot.auth, account: { ...alice, participantId: 'bob', username: 'bob' } } })
    rendered.rerender(createElement(ChatroomAccountPanels, { ...props, room: snapshot }))
    expect((screen.getByLabelText('当前密码') as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText('新密码') as HTMLInputElement).value).toBe('')
  })
  it('keeps long system prompts collapsed until an administrator opens them', () => {
    renderSettings(view())
    const details = screen.getByText('编辑系统提示词').closest('details')!
    expect(details.open).toBe(false)
    fireEvent.click(screen.getByText('编辑系统提示词'))
    expect(details.open).toBe(true)
    expect(screen.getByLabelText('群聊主 Agent 系统提示词')).toBeTruthy()
  })

  it.each([
    ['idle', '正在准备可管理群聊…', false, false],
    ['loading', '正在加载可管理的群聊…', false, false],
    ['ready', '暂无可管理的群聊。', false, true],
    ['error', '安全的目录加载失败提示', true, true],
  ] as const)('explains the %s manageable-room directory state without exposing an AI editor', (status, text, retry, reload) => {
    const loadManageableRooms = vi.fn(async (_signal?: AbortSignal) => undefined)
    renderSettings(view({
      auth: { enabled: false, authenticated: true, canManageSettings: true, providers: [], allowSelfRegistration: true, bootstrapRequired: false },
      manageableRooms: [],
      manageableRoomsStatus: status,
      ...(status === 'error' ? { manageableRoomsError: '安全的目录加载失败提示' } : {}),
    } as Partial<ChatroomView>), undefined, { loadManageableRooms })

    expect(screen.getByTestId('chatroom-settings-agents-status').textContent).toContain(text)
    expect(screen.queryByTestId('chatroom-settings-agents')).toBeNull()
    expect(screen.queryByLabelText('AI 成员名称')).toBeNull()
    expect(screen.queryByRole('alert') === null).toBe(!retry)
    const button = screen.queryByRole('button', { name: '重新加载可管理群聊' })
    expect(button === null).toBe(!reload)
    if (button !== null) {
      loadManageableRooms.mockClear()
      fireEvent.click(button)
      expect(loadManageableRooms).toHaveBeenCalledOnce()
      expect(loadManageableRooms.mock.calls[0]?.[0]).toBeInstanceOf(AbortSignal)
    }
  })

  it('cancels a manageable-room directory read while hidden or after settings unmount', async () => {
    const signals: AbortSignal[] = []
    const loadManageableRooms = vi.fn((signal?: AbortSignal) => {
      if (signal !== undefined) signals.push(signal)
      return new Promise<void>(() => {})
    })
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    const props = {
      useChatroom: (selector: (snapshot: ChatroomView) => unknown) => selector(view()),
      closeAccount: vi.fn(), changePassword: vi.fn(async () => true), closeAdmin: vi.fn(), openAdmin: vi.fn(async () => undefined),
      adminCreateUser: vi.fn(async () => true), adminUpdateUser: vi.fn(async () => true), adminSetSelfRegistration: vi.fn(async () => true),
      adminSetAutoRedirectProvider: vi.fn(async () => true), adminSaveProvider: vi.fn(async () => true), adminDeleteProvider: vi.fn(async () => true),
      openDirect: vi.fn(async () => undefined), closeDirect: vi.fn(), sendDirect: vi.fn(async () => true), closeWecomAuthorization: vi.fn(),
      loadManageableRooms,
    } as unknown as Parameters<typeof ChatroomSettingsSection>[0]
    const rendered = render(createElement(ChatroomSettingsSection, props))
    expect(signals).toHaveLength(1)

    visibility.mockReturnValue('hidden')
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(signals[0]?.aborted).toBe(true)

    visibility.mockReturnValue('visible')
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    await waitFor(() => expect(signals).toHaveLength(2))
    rendered.unmount()
    expect(signals[1]?.aborted).toBe(true)
  })

  it('does not report a failed global settings save as success', async () => {
    const saveAutomation = vi.fn(async () => false)
    renderSettings(view(), saveAutomation)
    fireEvent.change(screen.getByLabelText('判断模型'), { target: { value: 'deepseek\u0000reasoner' } })
    fireEvent.click(screen.getByRole('button', { name: '保存判断模型' }))

    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('未保存，请重试。'))
    expect(screen.queryByText('已保存。')).toBeNull()
  })

  it('does not expose global model or prompt saves to ordinary members', () => {
    renderSettings(view({ automationOverview: {
      ...view().automationOverview!,
      canManage: false,
    } }))

    expect(screen.queryByRole('button', { name: '保存判断模型' })).toBeNull()
    expect(screen.queryByRole('button', { name: '保存系统提示词' })).toBeNull()
    expect(screen.queryByLabelText('AI 自动响应设置')).toBeNull()
    expect(screen.queryByLabelText('Agent 系统提示词设置')).toBeNull()
    expect(screen.queryByText('AI 成员管理')).toBeNull()
  })

  it('fails closed for a member even if stale administrator policy is still in memory', () => {
    const loadAutomation = vi.fn()
    renderSettings(view({ auth: { ...view().auth, canManageSettings: true, account: { ...view().auth.account!, role: 'member' } } }), undefined, { loadAutomation })
    expect(loadAutomation).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('判断模型')).toBeNull()
    expect(screen.queryByLabelText('群聊主 Agent 系统提示词')).toBeNull()
    expect(screen.queryByLabelText('系统管理')).toBeNull()
    expect(screen.queryByRole('button', { name: '退出登录' })).toBeNull()
    expect(screen.queryByTestId('chatroom-settings')).toBeNull()
  })

  it('offers logout without any room and blocks repeated clicks until the request finishes', async () => {
    const done = Promise.withResolvers<void>()
    const logout = vi.fn(() => done.promise)
    renderSettings(view({ auth: { ...view().auth, canManageSettings: false } }), undefined, { logout }, true)
    fireEvent.click(screen.getByRole('button', { name: '退出登录' }))
    expect(screen.getByRole('button', { name: '正在退出…' }).hasAttribute('disabled')).toBe(true)
    expect(logout).toHaveBeenCalledOnce()
    done.reject(new Error('network offline'))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('尚未确认注销'))
    expect(screen.getByRole('button', { name: '退出登录' }).hasAttribute('disabled')).toBe(false)
  })

  it('accepts the documented six-character password and explains the legacy admin role', () => {
    const account = { participantId: 'alice', username: 'alice', displayName: 'Alice', avatarId: 'whale' as const,
      role: 'admin' as const, status: 'active' as const, createdAt: 1 }
    renderSettings(view({ auth: { ...view().auth, canManageSettings: false, account } }), undefined, {}, true)
    fireEvent.change(screen.getByLabelText('当前密码'), { target: { value: 'old-password' } })
    fireEvent.change(screen.getByLabelText('新密码'), { target: { value: '123456' } })
    fireEvent.change(screen.getByLabelText('确认新密码'), { target: { value: '123456' } })
    expect(screen.getByRole('button', { name: '修改密码' }).hasAttribute('disabled')).toBe(false)
    expect(screen.getByText(/历史 admin 角色与普通成员相同/)).toBeTruthy()
  })
})
