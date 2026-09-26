import { expect, it, vi } from 'vitest'
import { watchNativeSessionSync } from '../src/client/native-session-sync.js'
import { ChatroomClientStore } from '../src/client/store.js'

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((nextResolve, nextReject) => { resolve = nextResolve; reject = nextReject })
  return { promise, resolve, reject }
}

async function settle(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

it('pulls once after readiness and does not overlap automatic pulls', async () => {
  let view = new ChatroomClientStore().getSnapshot()
  let generation: { id: number; host: { home: string } } | undefined
  const listeners = new Set<() => void>()
  const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
  const first = deferred()
  const refresh = vi.fn(() => first.promise)
  const stop = watchNativeSessionSync({ getSnapshot: () => view, subscribe },
    { generation: { getSnapshot: () => generation, subscribe } }, refresh)
  const emit = () => listeners.forEach(listener => listener())
  expect(refresh).not.toHaveBeenCalled()
  view = { ...view, phase: 'ready', identity: { participantId: 'admin', displayName: 'Admin', avatarId: 'whale' } }
  emit(); emit()
  expect(refresh).toHaveBeenCalledTimes(1)
  generation = { id: 1, host: { home: 'host' } }; emit()
  expect(refresh).toHaveBeenCalledTimes(1)
  first.resolve(); await settle()
  generation = { id: 2, host: { home: 'host' } }; emit()
  expect(refresh).toHaveBeenCalledTimes(2)
  view = { ...view, identity: { ...view.identity!, participantId: 'admin' } }; emit()
  expect(refresh).toHaveBeenCalledTimes(2)
  view = { ...view, phase: 'auth-required' }; emit()
  expect(refresh).toHaveBeenCalledTimes(2)
  stop(); expect(listeners.size).toBe(0)
})

it('retries only on an explicit call after a settled failure', async () => {
  let view = new ChatroomClientStore().getSnapshot()
  const listeners = new Set<() => void>()
  const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
  const first = deferred()
  const second = deferred()
  const refresh = vi.fn()
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise)
  const stop = watchNativeSessionSync({ getSnapshot: () => view, subscribe },
    { generation: { getSnapshot: () => undefined, subscribe } }, refresh)
  const emit = () => listeners.forEach(listener => listener())
  view = { ...view, phase: 'ready', identity: { participantId: 'member', displayName: 'Member', avatarId: 'whale' } }
  emit()
  expect(refresh).toHaveBeenCalledTimes(1)
  first.reject(new Error('gateway deadline')); await settle()
  emit(); emit()
  expect(refresh).toHaveBeenCalledTimes(1)
  stop.retry()
  expect(refresh).toHaveBeenCalledTimes(2)
  second.resolve(); await settle()
  stop()
})

it('coalesces a manual retry requested during a slow catalogue read into one trailing pull', async () => {
  let view = new ChatroomClientStore().getSnapshot()
  const listeners = new Set<() => void>()
  const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
  const first = deferred()
  const second = deferred()
  const refresh = vi.fn()
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise)
  const stop = watchNativeSessionSync({ getSnapshot: () => view, subscribe },
    { generation: { getSnapshot: () => undefined, subscribe } }, refresh)
  view = { ...view, phase: 'ready', identity: { participantId: 'member', displayName: 'Member', avatarId: 'whale' } }
  listeners.forEach(listener => listener())
  expect(refresh).toHaveBeenCalledTimes(1)
  stop.retry(); stop.retry()
  expect(refresh).toHaveBeenCalledTimes(1)
  first.reject(new Error('gateway deadline')); await settle()
  expect(refresh).toHaveBeenCalledTimes(2)
  second.resolve(); await settle()
  stop()
})

it('does not replay a queued manual retry after logout or disposal', async () => {
  let view = new ChatroomClientStore().getSnapshot()
  const listeners = new Set<() => void>()
  const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
  const first = deferred()
  const refresh = vi.fn(() => first.promise)
  const stop = watchNativeSessionSync({ getSnapshot: () => view, subscribe },
    { generation: { getSnapshot: () => undefined, subscribe } }, refresh)
  view = { ...view, phase: 'ready', identity: { participantId: 'member', displayName: 'Member', avatarId: 'whale' } }
  listeners.forEach(listener => listener())
  stop.retry()
  view = { ...view, phase: 'auth-required' }
  listeners.forEach(listener => listener())
  first.reject(new Error('gateway deadline')); await settle()
  expect(refresh).toHaveBeenCalledTimes(1)

  const second = deferred()
  refresh.mockImplementationOnce(() => second.promise)
  view = { ...view, phase: 'ready', identity: { participantId: 'admin', displayName: 'Admin', avatarId: 'whale' } }
  listeners.forEach(listener => listener())
  expect(refresh).toHaveBeenCalledTimes(2)
  stop.retry()
  stop()
  second.resolve(); await settle()
  expect(refresh).toHaveBeenCalledTimes(2)
})

it('drops a pending retry across logout and same-identity login, then starts one fresh pull', async () => {
  let view = new ChatroomClientStore().getSnapshot()
  const listeners = new Set<() => void>()
  const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
  const first = deferred()
  const second = deferred()
  const refresh = vi.fn()
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise)
  const stop = watchNativeSessionSync({ getSnapshot: () => view, subscribe },
    { generation: { getSnapshot: () => undefined, subscribe } }, refresh)
  const emit = () => listeners.forEach(listener => listener())
  view = { ...view, phase: 'ready', identity: { participantId: 'member', displayName: 'Member', avatarId: 'whale' } }
  emit()
  stop.retry()
  view = { ...view, phase: 'auth-required' }
  emit()
  view = { ...view, phase: 'ready', identity: { participantId: 'member', displayName: 'Member', avatarId: 'whale' } }
  emit()
  expect(refresh).toHaveBeenCalledTimes(1)
  first.resolve(); await settle()
  expect(refresh).toHaveBeenCalledTimes(2)
  second.resolve(); await settle()
  emit()
  expect(refresh).toHaveBeenCalledTimes(2)
  stop()
})

it('revalidates a queued retry and performs one trailing pull for an identity change', async () => {
  let view = new ChatroomClientStore().getSnapshot()
  let generation: { id: number; host: { home: string } } | undefined
  const listeners = new Set<() => void>()
  const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
  const first = deferred()
  const second = deferred()
  const pulledPrincipals: Array<string | undefined> = []
  const refresh = vi.fn(() => {
    pulledPrincipals.push(view.identity?.participantId)
    return pulledPrincipals.length === 1 ? first.promise : second.promise
  })
  const stop = watchNativeSessionSync({ getSnapshot: () => view, subscribe },
    { generation: { getSnapshot: () => generation, subscribe } }, refresh)
  const emit = () => listeners.forEach(listener => listener())
  view = { ...view, phase: 'ready', identity: { participantId: 'member', displayName: 'Member', avatarId: 'whale' } }
  emit()
  expect(refresh).toHaveBeenCalledTimes(1)
  stop.retry()
  generation = { id: 1, host: { home: 'host' } }
  view = { ...view, identity: { ...view.identity!, participantId: 'admin' } }
  emit(); emit()
  expect(refresh).toHaveBeenCalledTimes(1)
  first.resolve(); await settle()
  expect(refresh).toHaveBeenCalledTimes(2)
  expect(pulledPrincipals).toEqual(['member', 'admin'])
  second.resolve(); await settle()
  emit()
  expect(refresh).toHaveBeenCalledTimes(2)
  stop()
})
