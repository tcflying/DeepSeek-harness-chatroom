// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatroomSettingsSection } from '../src/client/ChatroomAccountPanels.js'
import type { ChatroomView } from '../src/client/store.js'

afterEach(() => cleanup())

function view(patch: Partial<ChatroomView> = {}): ChatroomView {
  return {
    auth: { enabled: true, authenticated: true, canManageSettings: true, providers: [], allowSelfRegistration: true, bootstrapRequired: false },
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

function renderSettings(room: ChatroomView, saveAutomation = vi.fn(async () => true), extras: Record<string, unknown> = {}): void {
  const props = {
    useChatroom: (selector: (snapshot: ChatroomView) => unknown) => selector(room),
    closeAccount: vi.fn(), changePassword: vi.fn(async () => true), closeAdmin: vi.fn(), openAdmin: vi.fn(async () => undefined),
    adminCreateUser: vi.fn(async () => true), adminUpdateUser: vi.fn(async () => true), adminSetSelfRegistration: vi.fn(async () => true),
    adminSetAutoRedirectProvider: vi.fn(async () => true), adminSaveProvider: vi.fn(async () => true), adminDeleteProvider: vi.fn(async () => true),
    openDirect: vi.fn(async () => undefined), closeDirect: vi.fn(), sendDirect: vi.fn(async () => true), closeWecomAuthorization: vi.fn(), saveAutomation,
    logout: vi.fn(async () => undefined), ...extras,
  } as unknown as Parameters<typeof ChatroomSettingsSection>[0]
  render(createElement(ChatroomSettingsSection, props))
}

describe('ChatroomSettingsSection', () => {
  it('discards unsubmitted password fields when the settings panel switches accounts', () => {
    const alice = { participantId: 'alice', username: 'alice', displayName: 'Alice', avatarId: 'whale' as const,
      role: 'member' as const, status: 'active' as const, createdAt: 1 }
    let snapshot = view({ auth: { ...view().auth, canManageSettings: false, account: alice } })
    const props = { useChatroom: (selector: (value: ChatroomView) => unknown) => selector(snapshot) } as unknown as Parameters<typeof ChatroomSettingsSection>[0]
    const rendered = render(createElement(ChatroomSettingsSection, props))
    fireEvent.change(screen.getByLabelText('当前密码'), { target: { value: 'alice-private-password' } })
    fireEvent.change(screen.getByLabelText('新密码'), { target: { value: 'new-private-password' } })
    snapshot = view({ auth: { ...snapshot.auth, account: { ...alice, participantId: 'bob', username: 'bob' } } })
    rendered.rerender(createElement(ChatroomSettingsSection, props))
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
    renderSettings(view({ auth: { ...view().auth, canManageSettings: false } }), undefined, { loadAutomation })
    expect(loadAutomation).not.toHaveBeenCalled()
    expect(screen.queryByLabelText('判断模型')).toBeNull()
    expect(screen.queryByLabelText('群聊主 Agent 系统提示词')).toBeNull()
    expect(screen.queryByLabelText('系统管理')).toBeNull()
    expect(screen.getByRole('button', { name: '退出登录' })).toBeTruthy()
    expect(screen.getByText(/平台角色与群内角色分别授权/)).toBeTruthy()
  })

  it('offers logout without any room and blocks repeated clicks until the request finishes', async () => {
    const done = Promise.withResolvers<void>()
    const logout = vi.fn(() => done.promise)
    renderSettings(view({ auth: { ...view().auth, canManageSettings: false } }), undefined, { logout })
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
    renderSettings(view({ auth: { ...view().auth, canManageSettings: false, account } }))
    fireEvent.change(screen.getByLabelText('当前密码'), { target: { value: 'old-password' } })
    fireEvent.change(screen.getByLabelText('新密码'), { target: { value: '123456' } })
    fireEvent.change(screen.getByLabelText('确认新密码'), { target: { value: '123456' } })
    expect(screen.getByRole('button', { name: '修改密码' }).hasAttribute('disabled')).toBe(false)
    expect(screen.getByText(/历史 admin 角色不自动授予/)).toBeTruthy()
  })
})
