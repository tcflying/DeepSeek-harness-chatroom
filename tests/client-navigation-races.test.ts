import { afterEach, expect, it, vi } from 'vitest'
import { ChatroomClientStore } from '../src/client/store.js'

class FakeEventSource {
  static CLOSED = 2
  static instances: FakeEventSource[] = []
  readyState = 0
  onopen: (() => void) | null = null
  onmessage: ((event: MessageEvent<string>) => void) | null = null
  onerror: (() => void) | null = null
  constructor(readonly url: string) { FakeEventSource.instances.push(this) }
  close(): void { this.readyState = FakeEventSource.CLOSED }
}

const alice = { participantId: 'alice', displayName: 'Alice', avatarId: 'whale' as const }
const bob = { participantId: 'bob', displayName: 'Bob', avatarId: 'panda' as const }
const room = (id: string) => ({ id, title: id, aiDisplayName: 'AI', sessionId: `chatroom-v1-${id}` })
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
const session = (identity: typeof alice | typeof bob | null = alice, rooms = [room('a'), room('b')]) => ({ identity, rooms, soloSessionIds: [], auth: { enabled: true, authenticated: true, providers: [], allowSelfRegistration: true, bootstrapRequired: false } })

afterEach(() => {
  FakeEventSource.instances = []
  vi.unstubAllGlobals()
})

it('does not synchronously re-enter a mapped native Session before its first event stream exists', async () => {
  const documentStub = Object.assign(new EventTarget(), {
    title: 'Harness', visibilityState: 'hidden', documentElement: { toggleAttribute: vi.fn() },
  })
  vi.stubGlobal('document', documentStub)
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(response(session())))
  const store = new ChatroomClientStore()
  await store.start()
  let emissions = 0
  const unsubscribe = store.subscribe(() => {
    emissions += 1
    const selected = store.getSnapshot().room
    if (selected !== undefined) store.activateSession(selected.sessionId)
  })

  expect(() => store.activateSession(room('a').sessionId)).not.toThrow()
  expect(store.getSnapshot().room?.id).toBe('a')
  expect(emissions).toBeLessThan(10)
  expect(FakeEventSource.instances.filter(source => source.url.includes('/events?'))).toHaveLength(0)
  unsubscribe()
  store.stop()
})

it('does not let the identity prompt publication overwrite a synchronous different Session selection', async () => {
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(response(session(null, [room('a'), room('b')]))))
  const store = new ChatroomClientStore()
  await store.start()
  let replacePrompt = true
  const unsubscribe = store.subscribe(() => {
    if (replacePrompt && store.getSnapshot().open) {
      replacePrompt = false
      store.activateSession(room('b').sessionId)
    }
  })

  store.activateSession(room('a').sessionId)

  expect(store.getSnapshot().room?.id).toBe('b')
  expect(FakeEventSource.instances.filter(source => source.url.includes('/events?'))).toHaveLength(0)
  unsubscribe()
  store.stop()
})

it('keeps a real synchronous selection of a different Session while suppressing same-Session re-entry', async () => {
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(response(session())))
  const store = new ChatroomClientStore()
  await store.start()
  let replaceSelection = true
  const unsubscribe = store.subscribe(() => {
    const selected = store.getSnapshot().room
    if (selected === undefined) return
    if (replaceSelection) {
      replaceSelection = false
      store.activateSession(room('b').sessionId)
      return
    }
    store.activateSession(selected.sessionId)
  })

  store.activateSession(room('a').sessionId)

  expect(store.getSnapshot().room?.id).toBe('b')
  expect(FakeEventSource.instances.filter(source => source.url.includes('/events?')).map(source => source.url)).toEqual([
    '/plugins/deepseek-harness-chatroom/api/events?roomId=b',
  ])
  unsubscribe()
  store.stop()
})

it('does not open an old room stream when clearUnread synchronously selects another Session', async () => {
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(response(session())))
  const store = new ChatroomClientStore()
  await store.start()
  const notifications = FakeEventSource.instances.find(source => source.url.includes('/notifications'))!
  notifications.onmessage?.({ data: JSON.stringify({ type: 'notification', notification: {
    id: 'n1', roomId: 'a', roomTitle: 'a', participantId: 'other', displayName: 'Other', role: 'human', text: 'new', createdAt: 1,
  } }) } as MessageEvent<string>)
  let replaceOnClear = true
  const unsubscribe = store.subscribe(() => {
    if (replaceOnClear && store.getSnapshot().room?.id === 'a' && store.getSnapshot().unreadCount === 0) {
      replaceOnClear = false
      store.activateSession(room('b').sessionId)
    }
  })

  store.activateSession(room('a').sessionId)

  expect(store.getSnapshot().room?.id).toBe('b')
  expect(FakeEventSource.instances.filter(source => source.url.includes('/events?') && source.readyState !== FakeEventSource.CLOSED)
    .map(source => source.url)).toEqual(['/plugins/deepseek-harness-chatroom/api/events?roomId=b'])
  unsubscribe()
  store.stop()
})

it('does not open an old room stream when openEvents closeEvents synchronously selects another Session', async () => {
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(response(session())))
  const store = new ChatroomClientStore()
  await store.start()
  let emissions = 0
  let replaceOnClose = true
  const unsubscribe = store.subscribe(() => {
    emissions += 1
    if (replaceOnClose && emissions === 2 && store.getSnapshot().room?.id === 'a') {
      replaceOnClose = false
      store.activateSession(room('b').sessionId)
    }
  })

  store.activateSession(room('a').sessionId)

  expect(store.getSnapshot().room?.id).toBe('b')
  expect(FakeEventSource.instances.filter(source => source.url.includes('/events?') && source.readyState !== FakeEventSource.CLOSED)
    .map(source => source.url)).toEqual(['/plugins/deepseek-harness-chatroom/api/events?roomId=b'])
  unsubscribe()
  store.stop()
})

it('does not let an unbound closeEvents publication overwrite a synchronous mapped selection', async () => {
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(response(session())))
  const store = new ChatroomClientStore()
  await store.start()
  store.activateSession(room('a').sessionId)
  let replaceOnClose = true
  const unsubscribe = store.subscribe(() => {
    if (replaceOnClose && store.getSnapshot().room?.id === 'a') {
      replaceOnClose = false
      store.activateSession(room('b').sessionId)
    }
  })

  store.activateSession('unbound-session')

  expect(store.getSnapshot().room?.id).toBe('b')
  expect(FakeEventSource.instances.filter(source => source.url.includes('/events?') && source.readyState !== FakeEventSource.CLOSED)
    .map(source => source.url)).toEqual(['/plugins/deepseek-harness-chatroom/api/events?roomId=b'])
  unsubscribe()
  store.stop()
})

it('releases the re-entry latch after a subscriber failure and ignores a disposed stream callback', async () => {
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(response(session())))
  const store = new ChatroomClientStore()
  await store.start()
  const unsubscribe = store.subscribe(() => { throw new Error('projection failed') })

  expect(() => store.activateSession(room('a').sessionId)).toThrow('projection failed')
  unsubscribe()
  expect(() => store.activateSession(room('a').sessionId)).not.toThrow()
  const source = FakeEventSource.instances.find(item => item.url.includes('/events?'))!
  store.stop()
  source.onopen?.()

  expect(store.getSnapshot().connection).toBe('offline')
})

it('reports only a current room-selection failure without changing its original UX', async () => {
  const failure = new TypeError('network unavailable')
  const report = vi.fn(() => { throw new Error('diagnostics unavailable') })
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValueOnce(response(session())).mockRejectedValueOnce(failure))
  const store = new ChatroomClientStore(() => true, undefined, report)
  await store.start()
  await expect(store.selectRoom('a')).resolves.toBeUndefined()
  expect(report).toHaveBeenCalledExactlyOnceWith('room-selection', failure)
  expect(store.getSnapshot()).toMatchObject({ phase: 'ready', error: 'network unavailable' })
  store.stop()
})

it('does not report a late room-selection failure after the navigation is obsolete', async () => {
  const pending = Promise.withResolvers<Response>()
  const report = vi.fn()
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValueOnce(response(session())).mockReturnValueOnce(pending.promise))
  const store = new ChatroomClientStore(() => true, undefined, report)
  await store.start()
  const selecting = store.selectRoom('a')
  store.activateSession(room('b').sessionId)
  pending.reject(new TypeError('old network failure'))
  await selecting
  expect(report).not.toHaveBeenCalled()
  expect(store.getSnapshot().room?.id).toBe('b')
  store.stop()
})

it('keeps the latest room selection when an older select response arrives last', async () => {
  const first = Promise.withResolvers<Response>(), second = Promise.withResolvers<Response>()
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValueOnce(response(session())).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise))
  const store = new ChatroomClientStore(vi.fn(() => true))
  await store.start()
  const selectA = store.selectRoom('a'), selectB = store.selectRoom('b')
  second.resolve(response({ room: room('b') })); await selectB
  first.resolve(response({ room: room('a') })); await selectA
  expect(store.getSnapshot().room?.id).toBe('b')
  store.stop()
})

it('keeps an explicit room selection across same-selection native catalogue updates', async () => {
  const selected = Promise.withResolvers<Response>()
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.stubGlobal('fetch', vi.fn<typeof fetch>()
    .mockResolvedValueOnce(response(session())).mockReturnValueOnce(selected.promise))
  const open = vi.fn(() => true)
  const store = new ChatroomClientStore(open)
  await store.start()
  store.activateSession(undefined)
  const selecting = store.selectRoom('a')
  // A catalogue refresh emits even when the native selection has not changed.
  store.activateSession(undefined)
  selected.resolve(response({ room: room('a') }))
  await selecting
  expect(store.getSnapshot().room?.id).toBe('a')
  expect(open).toHaveBeenCalledWith(room('a').sessionId)
  store.stop()
})

it('discards an explicit room response when native navigation really changed', async () => {
  const selected = Promise.withResolvers<Response>()
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.stubGlobal('fetch', vi.fn<typeof fetch>()
    .mockResolvedValueOnce(response(session())).mockReturnValueOnce(selected.promise))
  const open = vi.fn(() => true)
  const store = new ChatroomClientStore(open)
  await store.start()
  const selecting = store.selectRoom('a')
  store.activateSession(room('b').sessionId)
  selected.resolve(response({ room: room('a') }))
  await selecting
  expect(store.getSnapshot().room?.id).toBe('b')
  expect(open).not.toHaveBeenCalled()
  store.stop()
})

it('drops an old direct response after close and a different-account login', async () => {
  const direct = Promise.withResolvers<Response>()
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.stubGlobal('fetch', vi.fn<typeof fetch>()
    .mockResolvedValueOnce(response(session()))
    .mockReturnValueOnce(direct.promise)
    .mockResolvedValueOnce(response({}))
    .mockResolvedValueOnce(response(session(bob))))
  const store = new ChatroomClientStore()
  await store.start()
  const opening = store.openDirect('bob')
  store.closeDirect()
  await store.logout()
  await store.login('bob', 'pw')
  direct.resolve(response({ peers: [bob], conversations: [{ id: 'old', peer: bob, createdAt: 1, updatedAt: 1 }], conversation: { id: 'old', peer: bob, createdAt: 1, updatedAt: 1 }, messages: [{ id: 'private-old' }] }))
  await opening
  expect(store.getSnapshot()).toMatchObject({ identity: bob, directOpen: false, directPeers: [], directConversations: [], directMessages: [] })
  store.stop()
})

it('does not let a stale direct-directory GET repopulate a new account', async () => {
  const directory = Promise.withResolvers<Response>()
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.stubGlobal('fetch', vi.fn<typeof fetch>()
    .mockResolvedValueOnce(response(session()))
    .mockReturnValueOnce(directory.promise)
    .mockResolvedValueOnce(response({}))
    .mockResolvedValueOnce(response(session(bob))))
  const store = new ChatroomClientStore()
  await store.start()
  const loading = store.loadDirectDirectory()
  await store.logout()
  await store.login('bob', 'pw')
  directory.resolve(response({ peers: [alice], conversations: [{ id: 'old', peer: alice, createdAt: 1, updatedAt: 1 }] }))
  await expect(loading).resolves.toBe(false)
  expect(store.getSnapshot()).toMatchObject({ identity: bob, directPeers: [], directConversations: [], directError: undefined })
  store.stop()
})

it('drops a late thread-open response after the panel closes or room changes', async () => {
  const opened = Promise.withResolvers<Response>()
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValueOnce(response(session())).mockReturnValueOnce(opened.promise))
  const store = new ChatroomClientStore()
  await store.start()
  store.activateSession(room('a').sessionId)
  const opening = store.openThread('a', { messageId: 'm1', role: 'human', displayName: 'Alice', text: 'old' })
  store.closeThread()
  store.activateSession(room('b').sessionId)
  opened.resolve(response({ thread: { id: 'thread-a', roomId: 'a', sessionId: 'chatroom-thread-v1-thread-a', createdAt: 1, root: { messageId: 'm1', role: 'human', displayName: 'Alice', text: 'old' } }, messages: [{ id: 'old-thread-message' }] }))
  await opening
  expect(store.getSnapshot()).toMatchObject({ room: { id: 'b' }, thread: undefined, threadMessages: [] })
  store.stop()
})
