// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ModelProgress } from '../src/client/ModelProgress.js'
import { ChatroomClientStore, type ChatroomView } from '../src/client/store.js'
import { isPlatformAdmin, watchAdminAccess } from '../src/client/admin-access.js'

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks() })
const view = (): ChatroomView => ({ ...new ChatroomClientStore().getSnapshot(), phase: 'ready', connection: 'online',
  room: { id: 'room', sessionId: 'main', title: '群', aiDisplayName: 'AI' },
  modelProgress: [{ roomId: 'room', sessionId: 'main', name: 'GPT', seq: 1, status: 'thinking', text: '分析最后一行', updatedAt: Date.now(), startedAt: Date.now() }],
}) as ChatroomView

it('shows the real last line, silence age, disconnect and completion without leaving timers behind', () => {
  vi.useFakeTimers()
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  let snapshot = view()
  const useChatroom = <T,>(select: (v: ChatroomView) => T) => select(snapshot)
  const ui = render(<ModelProgress useChatroom={useChatroom} session={{ sessionId: "main" }} />)
  expect(screen.getByText('正在思考')).toBeTruthy()
  expect(screen.getByText('GPT')).toBeTruthy()
  expect(screen.getByText('分析最后一行')).toBeTruthy()
  act(() => vi.advanceTimersByTime(31_000))
  expect(screen.getByText(/31 秒无新进展/)).toBeTruthy()
  snapshot = { ...snapshot, connection: 'offline' }
  ui.rerender(<ModelProgress useChatroom={useChatroom} session={{ sessionId: "main" }} />)
  expect(screen.getByText('连接中断，进展待同步')).toBeTruthy()
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  act(() => document.dispatchEvent(new Event('visibilitychange')))
  expect(vi.getTimerCount()).toBe(0)
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  act(() => document.dispatchEvent(new Event('visibilitychange')))
  snapshot = { ...snapshot, modelProgress: [{ ...snapshot.modelProgress![0]!, status: 'completed', updatedAt: Date.now() }] }
  ui.rerender(<ModelProgress useChatroom={useChatroom} session={{ sessionId: "main" }} />)
  expect(screen.getByText('GPT')).toBeTruthy()
  expect(screen.getAllByText('已完成')).toHaveLength(2)
  act(() => vi.advanceTimersByTime(16_000))
  expect(screen.queryByRole('region', { name: '模型实时进展' })).toBeNull()
  expect(vi.getTimerCount()).toBe(0)
  ui.unmount()
  expect(vi.getTimerCount()).toBe(0)
})

it('does not mix room agents into branch/Solo views or show another room', () => {
  const base = view()
  const snapshot = { ...base, modelProgress: [{ ...base.modelProgress![0]!, sessionId: 'chatroom-agent-v1-room-ai' }] }
  const useChatroom = <T,>(select: (v: ChatroomView) => T) => select(snapshot)
  const ui = render(<ModelProgress useChatroom={useChatroom} session={{ sessionId: "branch" }} />)
  expect(ui.container.textContent).toBe('')
  ui.rerender(<ModelProgress useChatroom={useChatroom} session={{ sessionId: "main" }} />)
  expect(ui.container.textContent).toContain('分析最后一行')
})

it('stops ticking when its room progress is hidden by Direct or authentication', () => {
  vi.useFakeTimers()
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  let snapshot = view()
  const useChatroom = <T,>(select: (v: ChatroomView) => T) => select(snapshot)
  const ui = render(<ModelProgress useChatroom={useChatroom} session={{ sessionId: 'main' }} />)
  expect(vi.getTimerCount()).toBe(1)
  snapshot = { ...snapshot, directOpen: true }
  ui.rerender(<ModelProgress useChatroom={useChatroom} session={{ sessionId: 'main' }} />)
  expect(ui.container.textContent).toBe('')
  expect(vi.getTimerCount()).toBe(0)
  snapshot = { ...snapshot, directOpen: false }
  ui.rerender(<ModelProgress useChatroom={useChatroom} session={{ sessionId: 'main' }} />)
  expect(vi.getTimerCount()).toBe(1)
  snapshot = { ...snapshot, phase: 'auth-required' }
  ui.rerender(<ModelProgress useChatroom={useChatroom} session={{ sessionId: 'main' }} />)
  expect(vi.getTimerCount()).toBe(0)
})

it('unmounts privileged native shells on loading, role demotion, and logout; restores only active super-admin', () => {
  let snapshot = view()
  snapshot = { ...snapshot, auth: { ...snapshot.auth, enabled: true, authenticated: false } }
  const listeners = new Set<() => void>()
  const restore = vi.fn(), restrict = vi.fn(() => restore)
  const stop = watchAdminAccess({ getSnapshot: () => snapshot,
    subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener) } } }, restrict)
  expect(restrict).toHaveBeenCalledTimes(1)
  for (const role of ['member', 'admin', 'super-admin'] as const) {
    snapshot = { ...snapshot, auth: { ...snapshot.auth, authenticated: true,
      account: { participantId: 'u', username: 'u', displayName: 'U', avatarId: 'whale', role, status: 'active', createdAt: 1 } } }
    listeners.forEach(listener => listener())
    expect(isPlatformAdmin(snapshot)).toBe(role === 'super-admin')
  }
  expect(restore).toHaveBeenCalledTimes(1)
  snapshot = { ...snapshot, phase: 'loading' }
  listeners.forEach(listener => listener())
  expect(restrict).toHaveBeenCalledTimes(2)
  stop()
  expect(restore).toHaveBeenCalledTimes(2)
  expect(listeners.size).toBe(0)
})
