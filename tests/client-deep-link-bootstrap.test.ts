import { afterEach, expect, it, vi } from 'vitest'
import { invitedRoomFromLocation } from '../src/client/branch-frame.js'
import { scheduleDeepLinkNavigation, waitForNativeDirectoryReady } from '../src/client/index.js'
import { ChatroomClientStore } from '../src/client/store.js'

class FakeEventSource {
  static CLOSED = 2
  readyState = 0
  onopen: (() => void) | null = null
  onmessage: ((event: MessageEvent<string>) => void) | null = null
  onerror: (() => void) | null = null
  constructor(readonly url: string) {}
  close(): void { this.readyState = FakeEventSource.CLOSED }
}

const response = (value: unknown) => new Response(JSON.stringify(value), {
  status: 200,
  headers: { 'Content-Type': 'application/json' },
})
const room = (id: string) => ({ id, title: id, aiDisplayName: 'AI', sessionId: `chatroom-v1-${id}` })
const session = (rooms: readonly ReturnType<typeof room>[]) => ({
  identity: { participantId: 'member', displayName: 'Member', avatarId: 'whale' as const },
  rooms,
  soloSessionIds: [],
  auth: { enabled: true, authenticated: true, providers: [], allowSelfRegistration: true, bootstrapRequired: false },
})

afterEach(() => vi.unstubAllGlobals())

class NativeDirectory {
  snapshot: { phase: 'pending' | 'ready'; current: string | undefined } = { phase: 'pending', current: undefined }
  private readonly listeners = new Set<() => void>()
  getSnapshot = () => this.snapshot
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
  emit(snapshot: typeof this.snapshot): void {
    this.snapshot = snapshot
    this.listeners.forEach(listener => listener())
  }
}

class DeepLinkStore {
  snapshot: { phase: 'auth-required' | 'ready'; identity: { participantId: string } | undefined } = {
    phase: 'auth-required', identity: undefined,
  }
  private readonly listeners = new Set<() => void>()
  getSnapshot = () => this.snapshot
  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
  emit(snapshot: typeof this.snapshot): void {
    this.snapshot = snapshot
    this.listeners.forEach(listener => listener())
  }
}

async function delayedUrlSelectionThenNativeCurrent(): Promise<ChatroomClientStore> {
  const target = room('target')
  const restored = room('restored')
  const selected = Promise.withResolvers<Response>()
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.stubGlobal('fetch', vi.fn<typeof fetch>()
    .mockResolvedValueOnce(response(session([target, restored])))
    .mockReturnValueOnce(selected.promise))
  const store = new ChatroomClientStore(vi.fn(() => true))

  // Mirrors index.tsx: await store.start(), then parse the top-level URL and
  // begin selectRoom. The native list has no current selection until later.
  await store.start()
  const requested = invitedRoomFromLocation({ search: '?dsh-chatroom-room=target' }, undefined)
  expect(requested).toBe(target.id)
  const selecting = store.selectRoom(requested!)

  // This is the first host list emission restoring its persisted current
  // session. There is no user gesture/source parameter at this store boundary.
  store.activateSession(restored.sessionId, restored.title)
  selected.resolve(response({ room: target }))
  await selecting
  return store
}

it('currently drops a delayed valid URL selection when bootstrap first restores an old native current', async () => {
  const store = await delayedUrlSelectionThenNativeCurrent()
  expect(store.getSnapshot().room?.id).toBe('restored')
  store.stop()
})

it('starts URL selection after the pending-to-ready restored current becomes the baseline', async () => {
  const target = room('target')
  const restored = room('restored')
  const selected = Promise.withResolvers<Response>()
  const native = new NativeDirectory()
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.stubGlobal('fetch', vi.fn<typeof fetch>()
    .mockResolvedValueOnce(response(session([target, restored])))
    .mockReturnValueOnce(selected.promise))
  const store = new ChatroomClientStore(vi.fn(() => true))
  await store.start()
  let selecting: Promise<void> | undefined
  const stop = waitForNativeDirectoryReady(native, () => { selecting = store.selectRoom(target.id) }, () => {})
  // index.tsx's existing session-list subscriber runs before the deep-link
  // waiter, so this is the restored host baseline rather than a user click.
  store.activateSession(restored.sessionId, restored.title)
  native.emit({ phase: 'ready', current: restored.sessionId })
  expect(selecting).toBeDefined()
  selected.resolve(response({ room: target }))
  await selecting
  expect(store.getSnapshot().room?.id).toBe(target.id)
  stop(); store.stop()
})

it('cancels a pending URL intent when the current changes before directory readiness', () => {
  const native = new NativeDirectory()
  const ready = vi.fn()
  const cancelled = vi.fn()
  const stop = waitForNativeDirectoryReady(native, ready, cancelled)
  // A New Session/native row action can set current before the first successful
  // catalogue pull, so it must not be overwritten when that pull later settles.
  native.emit({ phase: 'pending', current: 'new-session' })
  native.emit({ phase: 'ready', current: 'new-session' })
  expect(cancelled).toHaveBeenCalledTimes(1)
  expect(ready).not.toHaveBeenCalled()
  stop()
})

it('keeps an actual native selection after directory readiness ahead of a delayed URL response', async () => {
  const target = room('target')
  const restored = room('restored')
  const selected = Promise.withResolvers<Response>()
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.stubGlobal('fetch', vi.fn<typeof fetch>()
    .mockResolvedValueOnce(response(session([target, restored])))
    .mockReturnValueOnce(selected.promise))
  const store = new ChatroomClientStore(vi.fn(() => true))
  await store.start()
  const selecting = store.selectRoom(target.id)
  // This happens after a ready baseline, so it is a real native navigation and
  // the existing revision guard must continue to win.
  store.activateSession(restored.sessionId, restored.title)
  selected.resolve(response({ room: target }))
  await selecting
  expect(store.getSnapshot().room?.id).toBe(restored.id)
  store.stop()
})

it('does not run a late directory-ready callback after disposal', () => {
  const native = new NativeDirectory()
  const ready = vi.fn()
  const stop = waitForNativeDirectoryReady(native, ready, vi.fn())
  stop()
  native.emit({ phase: 'ready', current: undefined })
  expect(ready).not.toHaveBeenCalled()
})

it('keeps an unauthenticated URL intent without selecting until login is ready', () => {
  const native = new NativeDirectory()
  const store = new DeepLinkStore()
  const select = vi.fn()
  const stop = scheduleDeepLinkNavigation(store, native, 'target', select)
  native.emit({ phase: 'ready', current: undefined })
  expect(select).not.toHaveBeenCalled()
  store.emit({ phase: 'ready', identity: { participantId: 'member' } })
  expect(select).toHaveBeenCalledTimes(1)
  expect(select).toHaveBeenCalledWith('target')
  store.emit({ phase: 'ready', identity: { participantId: 'member' } })
  expect(select).toHaveBeenCalledTimes(1)
  stop()
})

it('does not let a pending directory callback cross logout or an identity change', () => {
  const native = new NativeDirectory()
  const store = new DeepLinkStore()
  const select = vi.fn()
  const stop = scheduleDeepLinkNavigation(store, native, 'target', select)
  store.emit({ phase: 'ready', identity: { participantId: 'alice' } })
  store.emit({ phase: 'auth-required', identity: undefined })
  native.emit({ phase: 'ready', current: undefined })
  expect(select).not.toHaveBeenCalled()
  store.emit({ phase: 'ready', identity: { participantId: 'bob' } })
  expect(select).toHaveBeenCalledTimes(1)
  expect(select).toHaveBeenCalledWith('target')
  store.emit({ phase: 'ready', identity: { participantId: 'bob' } })
  expect(select).toHaveBeenCalledTimes(1)
  stop()
})
