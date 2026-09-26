import { EventEmitter } from 'node:events'
import { Readable } from 'node:stream'
import { afterEach, expect, it, vi } from 'vitest'
import { ChatroomHttpController } from '../src/http.js'
import { DiagnosticJournal } from '../src/diagnostics.js'
import type { Config } from '../src/config.js'

afterEach(() => vi.useRealTimers())

it('accepts only a fixed client runtime source and error class', async () => {
  const record = vi.fn()
  const runtime = {
    isReady: true,
    diagnostics: { record },
    identity: vi.fn(() => ({ participantId: 'member', displayName: 'Member', avatarId: 'dog' })),
  }
  const context = { logger: vi.fn(() => ({})), connection: { createSharedFetchHandler: vi.fn() } }
  const config = { authEnabled: false, authCookieName: 'chatroom-auth', cookieName: 'chatroom-session',
    sseHeartbeatMs: 1_000, dataDirectory: ':memory:', miniMaxCodePath: '' } as Config
  const controller = new ChatroomHttpController(context as never, runtime as never, config)
  const request = Object.assign(Readable.from([JSON.stringify({ runtimeSource: 'room-selection', runtimeErrorKind: 'RangeError', message: 'private', runtimeRangeError: { signature: 'stack-overflow', frames: ['syncSession:1:2', 'privateName:3:4'] } })]), {
    method: 'POST', url: '/plugins/deepseek-harness-chatroom/api/connection/diagnostic',
    headers: { 'content-type': 'application/json', host: 'chatroom.local', origin: 'http://chatroom.local' },
  })
  const response = { writeHead: vi.fn(), end: vi.fn(), setHeader: vi.fn(), getHeader: vi.fn() }
  await controller.handle(request as never, response as never)
  expect(record).toHaveBeenCalledWith({ event: 'client.runtime.failure', clientRuntime: { source: 'room-selection', rangeError: { signature: 'stack-overflow', frames: ['syncSession:1:2', 'anonymous:3:4'] } }, error: { kind: 'RangeError' } })
  expect(JSON.stringify(record.mock.calls)).not.toContain('private')
})

it('journals de-identified room selection stages and final HTTP completion', async () => {
  const record = vi.fn()
  const runtime = {
    isReady: true,
    diagnostics: { record },
    identity: vi.fn(() => ({ participantId: 'member-private', displayName: 'Member', avatarId: 'dog' })),
    selectRoom: vi.fn(async (_roomId: string, _identity: unknown, observe: (event: { stage: 'enter' | 'inspect', outcome: 'start' | 'complete', elapsedMs: number }) => void) => {
      observe({ stage: 'enter', outcome: 'start', elapsedMs: 0 })
      observe({ stage: 'inspect', outcome: 'complete', elapsedMs: 7 })
      return { id: 'room-private', title: 'Private', sessionId: 'session-private' }
    }),
  }
  const context = { logger: vi.fn(() => ({})), connection: { createSharedFetchHandler: vi.fn() } }
  const config = { authEnabled: false, authCookieName: 'chatroom-auth', cookieName: 'chatroom-session',
    sseHeartbeatMs: 1_000, dataDirectory: ':memory:', miniMaxCodePath: '' } as Config
  const controller = new ChatroomHttpController(context as never, runtime as never, config)
  const request = Object.assign(Readable.from([JSON.stringify({ roomId: 'room-private' })]), {
    method: 'POST', url: '/plugins/deepseek-harness-chatroom/api/rooms/select',
    headers: { 'content-type': 'application/json', host: 'chatroom.local', origin: 'http://chatroom.local' },
  })
  const response = Object.assign(new EventEmitter(), { writeHead: vi.fn(), end: vi.fn(), setHeader: vi.fn(), getHeader: vi.fn(), destroyed: false, writableEnded: false })
  await controller.handle(request as never, response as never)
  expect(record).toHaveBeenCalledWith(expect.objectContaining({ event: 'room.select.stage', roomSelection: expect.objectContaining({ stage: 'authentication', outcome: 'complete' }) }))
  expect(record).toHaveBeenCalledWith(expect.objectContaining({ event: 'room.select.stage', roomSelection: expect.objectContaining({ stage: 'inspect', outcome: 'complete' }) }))
  expect(record).toHaveBeenCalledWith(expect.objectContaining({ event: 'room.select.stage', roomSelection: expect.objectContaining({ stage: 'response', outcome: 'complete' }) }))
  const stages = record.mock.calls.map(([entry]) => entry).filter(entry => entry.event === 'room.select.stage')
  expect(new Set(stages.map(entry => entry.operationId)).size).toBe(1)
  expect(stages[0]?.operationId).toMatch(/^[0-9a-f-]{36}$/u)
  expect(stages.every(entry => entry.roomSelection.elapsedMs >= 0)).toBe(true)
  expect(JSON.stringify(record.mock.calls)).not.toContain('private')
})

it('marks a peer-closed room selection without emitting a false response completion', async () => {
  const room = { id: 'room', title: 'Room', sessionId: 'session' }
  let finish!: (value: typeof room) => void
  const record = vi.fn()
  const runtime = {
    isReady: true,
    diagnostics: { record },
    identity: vi.fn(() => ({ participantId: 'member', displayName: 'Member', avatarId: 'dog' })),
    selectRoom: vi.fn(() => new Promise<typeof room>(resolve => { finish = resolve })),
  }
  const context = { logger: vi.fn(() => ({})), connection: { createSharedFetchHandler: vi.fn() } }
  const config = { authEnabled: false, authCookieName: 'chatroom-auth', cookieName: 'chatroom-session',
    sseHeartbeatMs: 1_000, dataDirectory: ':memory:', miniMaxCodePath: '' } as Config
  const controller = new ChatroomHttpController(context as never, runtime as never, config)
  const request = Object.assign(Readable.from([JSON.stringify({ roomId: 'room' })]), {
    method: 'POST', url: '/plugins/deepseek-harness-chatroom/api/rooms/select',
    headers: { 'content-type': 'application/json', host: 'chatroom.local', origin: 'http://chatroom.local' },
  })
  const response = Object.assign(new EventEmitter(), { writeHead: vi.fn(), end: vi.fn(), setHeader: vi.fn(), getHeader: vi.fn(), destroyed: false, writableEnded: false })
  const pending = controller.handle(request as never, response as never)
  await vi.waitFor(() => expect(runtime.selectRoom).toHaveBeenCalledOnce())
  response.emit('close')
  finish(room)
  await pending
  expect(record).toHaveBeenCalledWith(expect.objectContaining({ event: 'room.select.stage',
    roomSelection: expect.objectContaining({ stage: 'response', outcome: 'failure', closed: true }) }))
  expect(record).not.toHaveBeenCalledWith(expect.objectContaining({ event: 'room.select.stage',
    roomSelection: expect.objectContaining({ stage: 'response', outcome: 'complete' }) }))
  expect(response.writeHead).not.toHaveBeenCalled()
})

it('does not let a diagnostic recorder failure change room selection success', async () => {
  const runtime = {
    isReady: true,
    diagnostics: { record: vi.fn(() => { throw new Error('journal unavailable') }) },
    identity: vi.fn(() => ({ participantId: 'member', displayName: 'Member', avatarId: 'dog' })),
    selectRoom: vi.fn(async () => ({ id: 'room', title: 'Room', sessionId: 'session' })),
  }
  const context = { logger: vi.fn(() => ({})), connection: { createSharedFetchHandler: vi.fn() } }
  const config = { authEnabled: false, authCookieName: 'chatroom-auth', cookieName: 'chatroom-session',
    sseHeartbeatMs: 1_000, dataDirectory: ':memory:', miniMaxCodePath: '' } as Config
  const controller = new ChatroomHttpController(context as never, runtime as never, config)
  const request = Object.assign(Readable.from([JSON.stringify({ roomId: 'room' })]), {
    method: 'POST', url: '/plugins/deepseek-harness-chatroom/api/rooms/select',
    headers: { 'content-type': 'application/json', host: 'chatroom.local', origin: 'http://chatroom.local' },
  })
  const response = Object.assign(new EventEmitter(), { writeHead: vi.fn(), end: vi.fn(), setHeader: vi.fn(), getHeader: vi.fn(), destroyed: false, writableEnded: false })
  await expect(controller.handle(request as never, response as never)).resolves.toBeUndefined()
  expect(response.writeHead).toHaveBeenCalledWith(200, expect.any(Object))
})

it('revalidates a local authenticated SSE stream and closes it after account disablement', async () => {
  vi.useFakeTimers()
  const accountForRequest = vi.fn().mockResolvedValue({})
  const account = vi.fn().mockReturnValue({ participantId: 'member' })
  const runtime = {
    diagnostics: new DiagnosticJournal(':memory:'),
    auth: { accountForRequest, account },
  }
  const context = {
    logger: vi.fn(() => ({})),
    connection: { createSharedFetchHandler: vi.fn() },
  }
  const config = {
    authEnabled: true,
    authMode: 'local',
    authCookieName: 'chatroom-auth',
    sseHeartbeatMs: 1_000,
    dataDirectory: ':memory:',
    miniMaxCodePath: '',
  } as Config
  const controller = new ChatroomHttpController(context as never, runtime as never, config)
  const request = Object.assign(new EventEmitter(), {
    aborted: false, headers: { cookie: 'chatroom-auth=current-session' }, url: '/events?roomId=private',
  })
  const response = Object.assign(new EventEmitter(), {
    destroyed: false, writableEnded: false, writeHead: vi.fn(), write: vi.fn(() => true), end: vi.fn(),
  })
  const subscribe = vi.fn((isCurrentSession: () => boolean) => {
    expect(isCurrentSession()).toBe(true)
    return vi.fn()
  })

  ;(controller as unknown as { openStream: Function }).openStream(
    request,
    response,
    'room',
    { participantId: 'member', displayName: 'Member', avatarId: 'dog' },
    subscribe,
  )
  await vi.advanceTimersByTimeAsync(1_000)
  await vi.advanceTimersByTimeAsync(0)

  expect(accountForRequest).toHaveBeenCalledOnce()
  expect(account).toHaveBeenCalledWith('current-session')
  expect(subscribe).toHaveBeenCalledOnce()
  expect(response.end).toHaveBeenCalledOnce()
})
