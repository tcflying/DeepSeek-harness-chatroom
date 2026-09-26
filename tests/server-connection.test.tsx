// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { ConnectionState } from '@deepseek-ai/dsh-client-connection/client'
import { ServerConnectionStatus } from '../src/client/ServerConnectionStatus.js'
import { ChatroomClientStore } from '../src/client/store.js'
afterEach(() => { cleanup(); vi.useRealTimers() })
it('requires native and notification health; times out and recovers without replay', async () => {
  vi.useFakeTimers()
  const base = new ChatroomClientStore().getSnapshot()
  let snapshot = { ...base, phase: 'ready' as const, notificationConnection: 'connecting' as 'connecting' | 'online' }
  let state: ConnectionState = 'connected'
  const listeners = new Set<() => void>()
  const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
  const publish = () => act(() => { for (const listener of listeners) listener() })
  let finish!: () => void
  const store = { getSnapshot: () => snapshot, subscribe, reconnect: vi.fn(() => new Promise<void>(resolve => { finish = resolve })) }
  const connection = { state: { getSnapshot: () => state, subscribe }, reconnect: vi.fn() }
  render(<ServerConnectionStatus wide connection={connection} store={store} />)
  expect(screen.getByRole('status').textContent).toBe('服务器连接中')
  act(() => vi.advanceTimersByTime(15000))
  expect(screen.getByRole('status').textContent).toBe('连接超时 · 请重连')
  snapshot = { ...snapshot, notificationConnection: 'online' }; publish()
  expect(screen.getByRole('status').textContent).toBe('服务器已连接')
  state = 'disconnected'; publish()
  expect(screen.getByRole('status').textContent).toBe('服务器未连接')
  fireEvent.click(screen.getByRole('button', { name: '重新连接服务器' }))
  fireEvent.click(screen.getByRole('button', { name: '重新连接服务器' }))
  expect(connection.reconnect).toHaveBeenCalledTimes(1)
  expect(store.reconnect).toHaveBeenCalledTimes(1)
  await act(async () => finish())
  state = 'connected'; publish()
  expect(screen.getByRole('status').textContent).toBe('服务器已连接')
})

it('clears a failed manual attempt when all streams recover independently', async () => {
  vi.useFakeTimers()
  const base = new ChatroomClientStore().getSnapshot()
  const snapshot = { ...base, phase: 'ready' as const, notificationConnection: 'online' as const }
  let state: ConnectionState = 'disconnected'
  const listeners = new Set<() => void>()
  const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }
  const store = { getSnapshot: () => snapshot, subscribe, reconnect: vi.fn(async () => { throw new Error('network') }) }
  const connection = { state: { getSnapshot: () => state, subscribe }, reconnect: vi.fn() }
  render(<ServerConnectionStatus wide connection={connection} store={store} />)
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '重新连接服务器' })))
  expect(screen.getByRole('status').textContent).toBe('服务器未连接')
  state = 'connected'
  act(() => listeners.forEach(fn => fn()))
  expect(screen.getByRole('status').textContent).toBe('服务器已连接')
  expect(store.reconnect).toHaveBeenCalledTimes(1)
})

it('does not show healthy until the native session catalogue is ready, while an empty ready catalogue is valid', () => {
  vi.useFakeTimers()
  const base = new ChatroomClientStore().getSnapshot()
  const snapshot = { ...base, phase: 'ready' as const, notificationConnection: 'online' as const }
  const listeners = new Set<() => void>()
  const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }
  let catalogue = { phase: 'pending' as 'pending' | 'ready' }
  const store = { getSnapshot: () => snapshot, subscribe, reconnect: vi.fn(async () => {}) }
  const connection = { state: { getSnapshot: () => 'connected' as const, subscribe }, reconnect: vi.fn() }
  const nativeCatalogue = { getSnapshot: () => catalogue, subscribe }
  render(<ServerConnectionStatus wide connection={connection} store={store} nativeCatalogue={nativeCatalogue} />)

  expect(screen.getByRole('status').textContent).toBe('正在同步会话目录')
  expect(screen.getByRole('status').getAttribute('title')).toContain('会话目录：正在同步')
  act(() => vi.advanceTimersByTime(15_000))
  expect(screen.getByRole('status').textContent).toBe('目录同步超时 · 请重连')
  expect(screen.getByRole('status').getAttribute('title')).toContain('未自动重试')
  expect(connection.reconnect).not.toHaveBeenCalled()
  expect(store.reconnect).not.toHaveBeenCalled()

  catalogue = { phase: 'ready' } // Ready with no rows is a healthy, empty catalogue.
  act(() => listeners.forEach(fn => fn()))
  expect(screen.getByRole('status').textContent).toBe('服务器已连接')
  expect(screen.getByRole('status').getAttribute('title')).toContain('会话目录：已就绪')
})

it('cancels the catalogue timeout after a prompt native catalogue recovery', () => {
  vi.useFakeTimers()
  const base = new ChatroomClientStore().getSnapshot()
  const snapshot = { ...base, phase: 'ready' as const, notificationConnection: 'online' as const }
  const listeners = new Set<() => void>()
  const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }
  let catalogue = { phase: 'pending' as 'pending' | 'ready' }
  const store = { getSnapshot: () => snapshot, subscribe, reconnect: vi.fn(async () => {}) }
  const connection = { state: { getSnapshot: () => 'connected' as const, subscribe }, reconnect: vi.fn() }
  render(<ServerConnectionStatus wide connection={connection} store={store}
    nativeCatalogue={{ getSnapshot: () => catalogue, subscribe }} />)

  act(() => vi.advanceTimersByTime(5_000))
  catalogue = { phase: 'ready' }
  act(() => listeners.forEach(fn => fn()))
  act(() => vi.advanceTimersByTime(15_000))
  expect(screen.getByRole('status').textContent).toBe('服务器已连接')
})
