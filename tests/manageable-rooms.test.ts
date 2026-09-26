import { afterEach, expect, it, vi } from 'vitest'
import { ChatroomClientStore } from '../src/client/store.js'

class FakeEventSource {
  static CLOSED = 2
  readyState = 0
  onopen: (() => void) | null = null
  onmessage: ((event: MessageEvent<string>) => void) | null = null
  onerror: (() => void) | null = null
  close(): void { this.readyState = FakeEventSource.CLOSED }
}

const alice = { participantId: 'alice', displayName: 'Alice', avatarId: 'whale' as const }
const bob = { participantId: 'bob', displayName: 'Bob', avatarId: 'panda' as const }
const room = (id: string) => ({ id, title: id, aiDisplayName: 'AI', sessionId: `chatroom-v1-${id}` })
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
const session = (identity: typeof alice | typeof bob) => ({
  identity,
  rooms: [room('shared')],
  soloSessionIds: [],
  auth: { enabled: true, authenticated: true, providers: [], allowSelfRegistration: true, bootstrapRequired: false },
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('coalesces duplicate manageable-room reads and exposes a ready empty directory', async () => {
  const directory = Promise.withResolvers<Response>()
  const fetchMock = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(response(session(alice)))
    .mockReturnValueOnce(directory.promise)
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.stubGlobal('fetch', fetchMock)
  const store = new ChatroomClientStore()
  await store.start()

  const first = store.loadManageableRooms()
  const second = store.loadManageableRooms()
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(store.getSnapshot()).toMatchObject({ manageableRoomsStatus: 'loading', manageableRoomsError: undefined })

  directory.resolve(response({ rooms: [] }))
  await Promise.all([first, second])
  expect(store.getSnapshot()).toMatchObject({ manageableRooms: [], manageableRoomsStatus: 'ready', manageableRoomsError: undefined })
  store.stop()
})

it('does not let an old-account response replace a newer manageable-room load', async () => {
  const oldDirectory = Promise.withResolvers<Response>()
  const newDirectory = Promise.withResolvers<Response>()
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.stubGlobal('fetch', vi.fn<typeof fetch>()
    .mockResolvedValueOnce(response(session(alice)))
    .mockReturnValueOnce(oldDirectory.promise)
    .mockResolvedValueOnce(response({}))
    .mockResolvedValueOnce(response(session(bob)))
    .mockReturnValueOnce(newDirectory.promise))
  const store = new ChatroomClientStore()
  await store.start()

  const oldLoad = store.loadManageableRooms()
  await store.logout()
  await store.login('bob', 'pw')
  const newLoad = store.loadManageableRooms()
  oldDirectory.resolve(response({ rooms: [room('alice-only')] }))
  await oldLoad
  expect(store.getSnapshot()).toMatchObject({ identity: bob, manageableRoomsStatus: 'loading', manageableRooms: [] })

  newDirectory.resolve(response({ rooms: [room('bob-only')] }))
  await newLoad
  expect(store.getSnapshot()).toMatchObject({ identity: bob, manageableRoomsStatus: 'ready', manageableRooms: [room('bob-only')] })
  store.stop()
})

it('times out a manageable-room GET after fifteen seconds without exposing the response error', async () => {
  vi.useFakeTimers()
  const lateDirectory = Promise.withResolvers<Response>()
  const retryDirectory = Promise.withResolvers<Response>()
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.stubGlobal('fetch', vi.fn<typeof fetch>()
    .mockResolvedValueOnce(response(session(alice)))
    // A nonconforming carrier can ignore abort; the store still has to finish
    // its public operation at the deadline and discard this later response.
    .mockReturnValueOnce(lateDirectory.promise)
    .mockReturnValueOnce(retryDirectory.promise))
  const store = new ChatroomClientStore()
  await store.start()

  const loading = store.loadManageableRooms()
  await vi.advanceTimersByTimeAsync(15_000)
  await loading
  expect(store.getSnapshot()).toMatchObject({
    manageableRooms: [],
    manageableRoomsStatus: 'error',
    manageableRoomsError: '暂时无法加载可管理的群聊，请重试。',
  })
  const retry = store.loadManageableRooms()
  expect(store.getSnapshot().manageableRoomsStatus).toBe('loading')
  lateDirectory.resolve(response({ rooms: [room('late')] }))
  await Promise.resolve()
  expect(store.getSnapshot()).toMatchObject({ manageableRooms: [], manageableRoomsStatus: 'loading' })
  retryDirectory.resolve(response({ rooms: [room('retry')] }))
  await retry
  expect(store.getSnapshot()).toMatchObject({ manageableRooms: [room('retry')], manageableRoomsStatus: 'ready' })
  store.stop()
})

it('aborts a pending manageable-room GET when the store is disposed', async () => {
  let signal: AbortSignal | undefined
  let rejectPending: ((reason?: unknown) => void) | undefined
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.stubGlobal('fetch', vi.fn<typeof fetch>()
    .mockResolvedValueOnce(response(session(alice)))
    .mockImplementationOnce((_input, init) => new Promise((_, reject) => {
      signal = init?.signal ?? undefined
      rejectPending = reject
      signal?.addEventListener('abort', () => reject(new DOMException('disposed', 'AbortError')), { once: true })
    })))
  const store = new ChatroomClientStore()
  await store.start()

  const loading = store.loadManageableRooms()
  store.stop()
  expect(signal?.aborted).toBe(true)
  rejectPending?.(new DOMException('late failure', 'AbortError'))
  await loading
  expect(store.getSnapshot().manageableRoomsStatus).toBe('loading')
})

it('returns to idle when the settings owner cancels its manageable-room read', async () => {
  const directory = Promise.withResolvers<Response>()
  const owner = new AbortController()
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.stubGlobal('fetch', vi.fn<typeof fetch>()
    .mockResolvedValueOnce(response(session(alice)))
    .mockReturnValueOnce(directory.promise))
  const store = new ChatroomClientStore()
  await store.start()

  const loading = store.loadManageableRooms(owner.signal)
  owner.abort()
  await loading
  expect(store.getSnapshot()).toMatchObject({ manageableRooms: [], manageableRoomsStatus: 'idle', manageableRoomsError: undefined })
  directory.resolve(response({ rooms: [room('late')] }))
  await Promise.resolve()
  expect(store.getSnapshot()).toMatchObject({ manageableRooms: [], manageableRoomsStatus: 'idle' })
  store.stop()
})

it('starts a fresh read when an idle cancellation subscriber retries before the old response settles', async () => {
  const oldDirectory = Promise.withResolvers<Response>()
  const retryDirectory = Promise.withResolvers<Response>()
  const owner = new AbortController()
  const fetchMock = vi.fn<typeof fetch>()
    .mockResolvedValueOnce(response(session(alice)))
    .mockReturnValueOnce(oldDirectory.promise)
    .mockReturnValueOnce(retryDirectory.promise)
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.stubGlobal('fetch', fetchMock)
  const store = new ChatroomClientStore()
  await store.start()
  let retry: Promise<void> | undefined
  store.subscribe(() => {
    if (store.getSnapshot().manageableRoomsStatus === 'idle' && retry === undefined) {
      retry = store.loadManageableRooms()
    }
  })

  const oldLoad = store.loadManageableRooms(owner.signal)
  owner.abort()
  await oldLoad
  expect(fetchMock).toHaveBeenCalledTimes(3)
  expect(store.getSnapshot().manageableRoomsStatus).toBe('loading')

  oldDirectory.resolve(response({ rooms: [room('old')] }))
  await Promise.resolve()
  expect(store.getSnapshot()).toMatchObject({ manageableRooms: [], manageableRoomsStatus: 'loading' })
  retryDirectory.resolve(response({ rooms: [room('retry')] }))
  await retry
  expect(store.getSnapshot()).toMatchObject({ manageableRooms: [room('retry')], manageableRoomsStatus: 'ready' })
  store.stop()
})

it('reports a fixed public failure without exposing a server response body', async () => {
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.stubGlobal('fetch', vi.fn<typeof fetch>()
    .mockResolvedValueOnce(response(session(alice)))
    .mockResolvedValueOnce(response({ error: 'internal credential: do-not-display' }, 500)))
  const store = new ChatroomClientStore()
  await store.start()

  await store.loadManageableRooms()
  expect(store.getSnapshot()).toMatchObject({
    manageableRooms: [],
    manageableRoomsStatus: 'error',
    manageableRoomsError: '暂时无法加载可管理的群聊，请重试。',
  })
  expect(store.getSnapshot().manageableRoomsError).not.toContain('credential')
  store.stop()
})

it('does not start a manageable-room GET after loading synchronously stops the store', async () => {
  vi.useFakeTimers()
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(response(session(alice)))
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.stubGlobal('fetch', fetchMock)
  const store = new ChatroomClientStore()
  await store.start()
  let stopped = false
  store.subscribe(() => {
    if (stopped) return
    stopped = true
    store.stop()
  })

  await store.loadManageableRooms()
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(vi.getTimerCount()).toBe(0)
})
