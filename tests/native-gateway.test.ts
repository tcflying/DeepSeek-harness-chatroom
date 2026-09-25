import { createServer, request as httpRequest } from 'node:http'
import { once } from 'node:events'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import type { NativeTransport } from '../src/native-platform.js'
const nativePackage = createRequire(import.meta.url).resolve('@deepseek-ai/dsh-api-gateway/package.json')
const { RemoteStreamMuxServer } = await import(pathToFileURL(join(dirname(nativePackage), 'lib/types/stream-server.js')).href)
import { describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { WebSocket } from 'ws'
import { NativeGateway } from '../src/native-gateway.js'
import type { ChatroomRuntime } from '../src/room.js'
import type { Config } from '../src/config.js'

function fixture(sessionListDeadlineMs?: number) {
  let active = true
  const permitted = new Set(['alice-solo', 'shared-room'])
  const headerScan = vi.fn(async () => [])
  const account = { participantId: 'alice', displayName: 'Alice', avatarId: 'whale', role: 'member' }
  const runtime = {
    isReady: true,
    auth: { accountForRequest: vi.fn(async (token: string) => token === 'alice-token' && active ? { account } : {}) },
    canAccessNativeSession: vi.fn(async (id: string) => permitted.has(id)),
    createNativeSessionAccessSnapshot: vi.fn(() => ({ headers: (() => {
      let pending: Promise<unknown[]> | undefined
      return () => pending ??= headerScan()
    })() })),
    reserveSoloSession: vi.fn(async () => 'alice-solo'),
    ownsSoloSession: vi.fn((id: string) => id === 'alice-solo'),
    ownsSession: vi.fn((id: string) => id === 'shared-room'),
    assertPromptReferences: vi.fn(),
    submitNativeSession: vi.fn(async () => true),
    ownNativeFork: vi.fn(),
    diagnostics: { record: vi.fn() },
  } as unknown as ChatroomRuntime
  const config = {
    cwd: process.cwd(), authEnabled: true, authCookieName: 'chatroom-auth', authPublicOrigin: '',
    nativeTrustedHosts: [], settingsAdminParticipantIds: [], sseHeartbeatMs: 15_000,
  } as unknown as Config
  const dispatch = vi.fn(async (request: Request) => {
    const body = await request.clone().json() as { rpcId: string }
    return Response.json({ type: 'server-response', rpcId: body.rpcId, result: { ok: true, value: {} } })
  })
  const ready = Promise.withResolvers<void>()
  const eventsClosed = Promise.withResolvers<void>()
  const available = Promise.withResolvers<void>()
  const queue: Array<Record<string, unknown>> = []
  let notify: () => void = () => available.resolve()
  const events = async function* (_request: unknown, signal: AbortSignal) {
    ready.resolve()
    try {
    while (!signal.aborted) {
      if (queue.length === 0) {
        const pending = Promise.withResolvers<void>()
        notify = () => pending.resolve()
        signal.addEventListener('abort', notify, { once: true })
        try { await pending.promise } finally { signal.removeEventListener('abort', notify) }
      }
      const frame = queue.shift()
      if (frame !== undefined) yield frame
    }
    } finally { eventsClosed.resolve() }
  }
  const ctx = {} as Context
  const transport = { Mux: RemoteStreamMuxServer, gateway: { wireStream: { open: (_endpoint: string, payload: unknown, signal: AbortSignal) => events(payload, signal), failure: (error: Error) => ({ code: 'internal', message: error.message }) } } } as unknown as NativeTransport
  const gateway = new NativeGateway(ctx, runtime, config, dispatch, transport, sessionListDeadlineMs)
  return { gateway, runtime, dispatch, permitted, account, config, headerScan, ready, eventsClosed, revoke: () => { active = false }, push: (frame: (typeof queue)[number]) => { queue.push(frame); notify() } }
}

function rpc(method: string, payload: Record<string, unknown> = {}, token = 'alice-token'): Request {
  return new Request(`http://127.0.0.1/api/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: `chatroom-auth=${token}` },
    body: JSON.stringify({ type: 'client-request', rpcId: 'request-1', method, payload: method === '$events/result' ? payload : ('args' in payload ? payload : { args: { request: payload } }) }),
  })
}

describe('native account gateway', () => {
  it.each(['member', 'admin'])('does not give the platform %s role deployment or filesystem access', async role => {
    const f = fixture()
    f.account.role = role
    try {
      for (const method of ['settings/describe', 'settings/mutate', 'credentials/list', 'fs/read', 'plugins/install']) {
        expect((await f.gateway.fetch(rpc(method))).status).toBe(403)
      }
      expect(f.dispatch).not.toHaveBeenCalled()
    } finally { await f.gateway.close() }
  })

  it.each(['super-admin', 'allowlisted'])('permits only platform admin, not legacy %s grants', async role => {
    const f = fixture()
    if (role === 'super-admin') f.account.role = role
    else f.config.settingsAdminParticipantIds.push('alice')
    try {
      expect((await f.gateway.fetch(rpc('settings/describe'))).status).toBe(role === 'super-admin' ? 200 : 403)
      expect(f.dispatch).toHaveBeenCalledTimes(role === 'super-admin' ? 1 : 0)
    } finally { await f.gateway.close() }
  })
  it.each(['member', 'admin'])('denies %s preset/model and command bypass on own sessions', async role => {
    const f = fixture()
    f.account.role = role
    f.config.settingsAdminParticipantIds.push('alice')
    try {
      for (const method of ['session/selectModel', 'agentPresets/select']) {
        expect((await f.gateway.fetch(rpc(method, { sessionId: 'alice-solo' }))).status).toBe(403)
      }
      for (const line of ['/permission full', '/model secret', '/plugin install x', '/agent unrestricted']) {
        expect((await f.gateway.fetch(rpc('commands/execute', { sessionId: 'alice-solo', line }))).status).toBe(403)
        expect((await f.gateway.fetch(rpc('session/prompt', { sessionId: 'alice-solo', mode: 'queue', content: [{ type: 'text', text: line }] }))).status).toBe(403)
        expect((await f.gateway.fetch(rpc('subagents/prompt', { sessionId: 'alice-solo', content: [{ type: 'text', text: line }] }))).status).toBe(403)
      }
      expect((await f.gateway.fetch(rpc('session/create', { agentPreset: 'unrestricted' }))).status).toBe(403)
      expect((await f.gateway.fetch(rpc('session/rename', { sessionId: 'shared-room', title: 'forged' }))).status).toBe(403)
      expect(f.dispatch).not.toHaveBeenCalled()
    } finally { await f.gateway.close() }
  })
  it.each(['session/list', 'session/page', 'session/prompt', 'settings/describe', 'commands/execute'])('rejects unauthenticated %s before dispatch', async method => {
    const f = fixture()
    try {
      expect((await f.gateway.fetch(rpc(method, { sessionId: 'alice-solo' }, 'invalid'))).status).toBe(401)
      expect(f.dispatch).not.toHaveBeenCalled()
    } finally { await f.gateway.close() }
  })

  it.each(['session/page', 'session/attachment', 'session/selectModel', 'session/prompt', 'session/cancel', 'session/fork', 'session/rename', 'session/updateQueue', 'agentPresets/select', 'goals/create', 'workspace/archiveSession'])('denies foreign-session %s', async method => {
    const f = fixture()
    try {
      expect((await f.gateway.fetch(rpc(method, { sessionId: 'bob-solo' }))).status).toBe(403)
      expect(f.dispatch).not.toHaveBeenCalled()
    } finally { await f.gateway.close() }
  })

  it('filters native list and search responses before they leave the server', async () => {
    const f = fixture()
    f.dispatch.mockImplementation(async () => Response.json({ result: { ok: true, value: { items: [
      { sessionId: 'bob-solo', snippet: 'private Bob text' }, { sessionId: 'alice-solo', snippet: 'Alice text' },
    ] } } }))
    try {
      for (const method of ['session/list', 'session/search']) {
        const response = await f.gateway.fetch(rpc(method))
        expect(JSON.stringify(await response.json())).not.toContain('Bob')
      }
    } finally { await f.gateway.close() }
  })

  it('keeps human-only shared rooms visible before the first AI turn', async () => {
    const f = fixture()
    f.dispatch.mockResolvedValueOnce(Response.json({ result: { ok: true, value: { items: [
      { sessionId: 'shared-room', blank: true }, { sessionId: 'alice-solo', blank: true },
    ] } } }))
    try {
      const response = await f.gateway.fetch(rpc('session/list'))
      expect(await response.json()).toMatchObject({ result: { value: { items: [
        { sessionId: 'shared-room', blank: false }, { sessionId: 'alice-solo', blank: true },
      ] } } })
      expect(f.runtime.diagnostics.record).toHaveBeenCalledWith(expect.objectContaining({
        event: 'native.session-list.complete',
        sessionList: expect.objectContaining({ itemsCount: 2, upstreamElapsedMs: expect.any(Number), jsonElapsedMs: expect.any(Number), filterElapsedMs: expect.any(Number), totalElapsedMs: expect.any(Number), status: 200 }),
      }))
    } finally { await f.gateway.close() }
  })

  it('uses authenticated room admission for native prompts and pins Solo creation cwd', async () => {
    const f = fixture()
    try {
      expect((await f.gateway.fetch(rpc('session/prompt', { sessionId: 'shared-room', mode: 'queue', content: [{ type: 'text', text: '@DeepSeek hello' }] }))).status).toBe(200)
      expect(f.runtime.submitNativeSession).toHaveBeenCalledWith('shared-room', expect.objectContaining({ participantId: 'alice' }), [{ type: 'text', text: '@DeepSeek hello' }], 'queue', undefined)
      expect(f.dispatch).not.toHaveBeenCalled()
      expect((await f.gateway.fetch(rpc('session/create', { sessionId: 'bob-solo' }))).status).toBe(403)
      await f.gateway.fetch(rpc('session/create', { sessionId: 'alice-solo' }))
      expect(await f.dispatch.mock.calls[0]![0].clone().json()).toMatchObject({ payload: { args: { request: { cwd: process.cwd() } } } })
    } finally { await f.gateway.close() }
  })

  it('assigns native startup sessions to the caller after validating creation parameters', async () => {
    const f = fixture()
    try {
      expect((await f.gateway.fetch(rpc('session/create', { cwd: '/private/foreign' }))).status).toBe(403)
      expect((await f.gateway.fetch(rpc('session/create', { agentPreset: 5 }))).status).toBe(400)
      expect(f.runtime.reserveSoloSession).not.toHaveBeenCalled()
      expect((await f.gateway.fetch(rpc('session/create'))).status).toBe(200)
      expect(f.runtime.reserveSoloSession).toHaveBeenCalledWith(expect.objectContaining({ participantId: 'alice' }))
      expect(await f.dispatch.mock.calls[0]![0].clone().json()).toMatchObject({ payload: { args: { request: { sessionId: 'alice-solo', cwd: process.cwd() } } } })
    } finally { await f.gateway.close() }
  })

  it('authorizes pinned Remote agentId fields and filters cross-session reference candidates', async () => {
    const f = fixture()
    try {
      expect((await f.gateway.fetch(rpc('commands/list', { args: { agentId: 'alice-solo' } }))).status).toBe(200)
      expect((await f.gateway.fetch(rpc('commands/list', { args: { agentId: 'bob-solo', sessionId: 'alice-solo' } }))).status).toBe(403)
      f.dispatch.mockResolvedValueOnce(Response.json({ result: { ok: true, value: [{ sessionId: 'bob-solo', label: 'private' }, { sessionId: 'shared-room', label: 'shared' }] } }))
      const response = await f.gateway.fetch(rpc('sessionReferenceResolver/candidates', { args: { agentId: 'alice-solo', query: '' } }))
      expect(await response.json()).toMatchObject({ result: { value: [{ sessionId: 'shared-room' }] } })
    } finally { await f.gateway.close() }
  })

  it('denies unscoped Remote, cross-account descendant, forged approval, and cross-site requests', async () => {
    const f = fixture()
    try {
      for (const [method, payload] of [
        ['dynamicCordisRunner/unknown', { args: {} }],
        ['commands/execute', { args: { agentId: 'bob-solo', line: '/help' } }],
        ['subagent.history', { parentSessionId: 'shared-room', childSessionId: 'bob-solo' }],
        ['$events/result', {}],
      ] as const) expect((await f.gateway.fetch(rpc(method, payload))).status).toBe(403)
      const request = rpc('session/list')
      request.headers.set('Origin', 'https://attacker.example')
      expect((await f.gateway.fetch(request)).status).toBe(403)
      expect(f.dispatch).not.toHaveBeenCalled()
    } finally { await f.gateway.close() }
  })

  it('lets room members list and address only their authorized native subagents', async () => {
    const f = fixture()
    f.permitted.add('shared-child')
    try {
      f.dispatch.mockResolvedValueOnce(Response.json({ result: { ok: true, value: {
        parentAvailable: true, entries: [{ id: 'shared-child', kind: 'child' }, { id: 'bob-child', kind: 'child' }],
      } } }))
      const listed = await f.gateway.fetch(rpc('subagents/list', { args: { parentSessionId: 'shared-room' } }))
      expect(listed.status).toBe(200)
      expect(await listed.json()).toMatchObject({ result: { value: { entries: [{ id: 'shared-child', kind: 'child' }] } } })
      const prompt = { parentSessionId: 'shared-room', childSessionId: 'shared-child', mode: 'continuable', requestId: 'child-human-1', content: [{ type: 'text', text: 'hello' }] }
      expect((await f.gateway.fetch(rpc('subagents/prompt', prompt))).status).toBe(200)
      expect(f.runtime.assertPromptReferences).toHaveBeenCalledWith(expect.objectContaining({ participantId: 'alice' }), prompt.content)
      expect((await f.gateway.fetch(rpc('subagents/interruptByParent', { args: prompt }))).status).toBe(200)
      for (const method of ['subagents/list', 'subagents/prompt', 'subagents/interruptByParent']) {
        expect((await f.gateway.fetch(rpc(method, { ...prompt, parentSessionId: 'bob-room' }))).status).toBe(403)
        expect((await f.gateway.fetch(rpc(method, { ...prompt, childSessionId: 'bob-child' }))).status).toBe(403)
      }
    } finally { await f.gateway.close() }
  })

  it('closes an authenticated HTTP request even when its body never completes', async () => {
    const f = fixture()
    const server = createServer((req, res) => { void f.gateway.handle(req, res) })
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const address = server.address()
    if (address === null || typeof address === 'string') throw new Error('Missing port')
    const request = httpRequest(`http://127.0.0.1:${address.port}/api/session/list`, { method: 'POST', headers: { Cookie: 'chatroom-auth=alice-token', 'Content-Length': 100 } })
    request.on('error', () => { /* Closing the carrier resets the unfinished client request. */ })
    request.flushHeaders()
    try {
      await vi.waitFor(() => expect(f.runtime.auth.accountForRequest).toHaveBeenCalled())
      await f.gateway.close()
      expect(f.dispatch).not.toHaveBeenCalled()
    } finally {
      request.destroy()
      await f.gateway.close()
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    }
  })

  it('aborts a stalled native catalogue through the real HTTP carrier and permits a later manual refresh', async () => {
    const f = fixture(20)
    let aborted = 0
    f.dispatch.mockImplementation(async request => await new Promise<Response>((_resolve, reject) => {
      request.signal.addEventListener('abort', () => { aborted++; reject(request.signal.reason) }, { once: true })
    }))
    const server = createServer((req, res) => { void f.gateway.handle(req, res) })
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const address = server.address()
    if (address === null || typeof address === 'string') throw new Error('Missing port')
    const envelope = JSON.stringify({ type: 'client-request', rpcId: 'stalled-list', method: 'session/list', payload: { args: { request: {} } } })
    const result = new Promise<{ status: number; body: string }>((resolve, reject) => {
      const request = httpRequest(`http://127.0.0.1:${address.port}/api/session/list`, {
        method: 'POST', headers: { Cookie: 'chatroom-auth=alice-token', 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(envelope) },
      }, response => {
        const chunks: Buffer[] = []
        response.on('data', chunk => chunks.push(Buffer.from(chunk)))
        response.on('end', () => resolve({ status: response.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }))
      })
      request.on('error', reject)
      request.end(envelope)
    })
    try {
      await vi.waitFor(() => expect(f.dispatch).toHaveBeenCalledOnce())
      await expect(result).resolves.toMatchObject({ status: 504, body: JSON.stringify({ error: 'Native session catalogue timed out' }) })
      expect(aborted).toBe(1)
      expect(f.runtime.diagnostics.record).toHaveBeenCalledWith(expect.objectContaining({
        event: 'native.session-list.timeout', error: { kind: 'TimeoutError', httpStatus: 504 },
      }))
      f.dispatch.mockResolvedValueOnce(Response.json({ result: { ok: true, value: { items: [{ sessionId: 'alice-solo' }] } } }))
      await expect(f.gateway.fetch(rpc('session/list'))).resolves.toMatchObject({ status: 200 })
    } finally {
      await f.gateway.close()
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    }
  })

  it('cancels a late native catalogue body after the deadline instead of retaining it', async () => {
    const f = fixture(10)
    let cancelStarted = false
    f.dispatch.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 20))
      return new Response(new ReadableStream({ cancel: () => {
        cancelStarted = true
        return new Promise<void>(() => undefined)
      } }), {
        headers: { 'content-type': 'application/json' },
      })
    })
    try {
      await expect(f.gateway.fetch(rpc('session/list'))).resolves.toMatchObject({ status: 504 })
      await vi.waitFor(() => expect(cancelStarted).toBe(true))
    } finally { await f.gateway.close() }
  })

  it('returns the HTTP 504 while a non-cooperative catalogue filter remains pending, without leaking its late result', async () => {
    const f = fixture(10)
    const allowed = Promise.withResolvers<boolean>()
    f.dispatch.mockResolvedValue(Response.json({ result: { ok: true, value: { items: [{ sessionId: 'alice-solo' }] } } }))
    const canAccess = vi.mocked(f.runtime.canAccessNativeSession)
    canAccess.mockImplementation(async () => await allowed.promise)
    try {
      await expect(f.gateway.fetch(rpc('session/list'))).resolves.toMatchObject({ status: 504 })
      expect(f.runtime.diagnostics.record).toHaveBeenCalledWith(expect.objectContaining({
        event: 'native.session-list.timeout',
        sessionList: expect.objectContaining({ itemsCount: 1, deadlineAbortElapsedMs: expect.any(Number), status: 504 }),
      }))
      allowed.resolve(true)
      await new Promise(resolve => setImmediate(resolve))
    } finally { await f.gateway.close() }
  })

  it('stops awaiting a non-cooperative catalogue filter when its browser caller cancels', async () => {
    const f = fixture(1_000)
    const allowed = Promise.withResolvers<boolean>()
    const controller = new AbortController()
    f.dispatch.mockResolvedValue(Response.json({ result: { ok: true, value: { items: [{ sessionId: 'alice-solo' }] } } }))
    const canAccess = vi.mocked(f.runtime.canAccessNativeSession)
    canAccess.mockImplementation(async () => await allowed.promise)
    const pending = f.gateway.fetch(new Request(rpc('session/list'), { signal: controller.signal }))
    try {
      await vi.waitFor(() => expect(canAccess).toHaveBeenCalledOnce())
      controller.abort()
      await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
      allowed.resolve(true)
      await new Promise(resolve => setImmediate(resolve))
      expect(f.runtime.diagnostics.record).not.toHaveBeenCalledWith(expect.objectContaining({ event: 'native.session-list.timeout' }))
    } finally { await f.gateway.close() }
  })

  it('shares only one lazy header scan within a catalogue, and does not share it across identities or requests', async () => {
    const f = fixture()
    f.dispatch.mockImplementation(async request => {
      const body = await request.clone().json() as { rpcId: string }
      return Response.json({ type: 'server-response', rpcId: body.rpcId, result: { ok: true, value: { items: [
        { sessionId: 'unknown-a' }, { sessionId: 'unknown-b' },
      ] } } })
    })
    const canAccess = vi.mocked(f.runtime.canAccessNativeSession)
    canAccess.mockImplementation(async (_id: string, identity: { participantId: string }, _visited: unknown, snapshot) => {
      if (snapshot === undefined) throw new Error('catalogue snapshot missing')
      await snapshot.headers()
      return identity.participantId === 'alice'
    })
    try {
      await expect(f.gateway.fetch(rpc('session/list'))).resolves.toMatchObject({ status: 200 })
      expect(f.headerScan).toHaveBeenCalledOnce()
      f.account.participantId = 'bob'
      await expect(f.gateway.fetch(rpc('session/list'))).resolves.toMatchObject({ status: 200 })
      expect(f.headerScan).toHaveBeenCalledTimes(2)
      expect(canAccess.mock.calls.at(-1)?.[1]).toMatchObject({ participantId: 'bob' })
    } finally { await f.gateway.close() }
  })

  it('seeds catalogue lineage only from the successful native response, never client payload or search', async () => {
    const f = fixture()
    const nativeItems = [{ sessionId: 'native-child', parentSessionId: 'shared-room' }]
    f.dispatch.mockResolvedValue(Response.json({ result: { ok: true, value: { items: nativeItems } } }))
    try {
      await f.gateway.fetch(rpc('session/list', { items: [{ sessionId: 'forged-child', parentSessionId: 'shared-room' }] }))
      expect(f.runtime.createNativeSessionAccessSnapshot).toHaveBeenCalledExactlyOnceWith(nativeItems)
      vi.mocked(f.runtime.createNativeSessionAccessSnapshot).mockClear()
      f.dispatch.mockResolvedValue(Response.json({ result: { ok: true, value: { items: nativeItems } } }))
      await f.gateway.fetch(rpc('session/search', { query: 'hello' }))
      expect(f.runtime.createNativeSessionAccessSnapshot).not.toHaveBeenCalled()
    } finally { await f.gateway.close() }
  })

  it('does not apply the catalogue deadline to native write requests', async () => {
    const f = fixture(10)
    f.dispatch.mockImplementation(async request => {
      await new Promise(resolve => setTimeout(resolve, 20))
      expect(request.signal.aborted).toBe(false)
      const body = await request.clone().json() as { rpcId: string }
      return Response.json({ type: 'server-response', rpcId: body.rpcId, result: { ok: true, value: {} } })
    })
    try {
      await expect(f.gateway.fetch(rpc('session/create', { sessionId: 'alice-solo' }))).resolves.toMatchObject({ status: 200 })
    } finally { await f.gateway.close() }
  })

  it('propagates a browser carrier disconnect to a hanging catalogue dispatch', async () => {
    const f = fixture(1_000)
    let aborted = 0
    f.dispatch.mockImplementation(async request => await new Promise<Response>((_resolve, reject) => {
      request.signal.addEventListener('abort', () => { aborted++; reject(request.signal.reason) }, { once: true })
    }))
    const server = createServer((req, res) => { void f.gateway.handle(req, res) })
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const address = server.address()
    if (address === null || typeof address === 'string') throw new Error('Missing port')
    const envelope = JSON.stringify({ type: 'client-request', rpcId: 'disconnect-list', method: 'session/list', payload: { args: { request: {} } } })
    const carrier = httpRequest(`http://127.0.0.1:${address.port}/api/session/list`, {
      method: 'POST', headers: { Cookie: 'chatroom-auth=alice-token', 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(envelope) },
    })
    carrier.on('error', () => { /* Expected after the browser carrier is cancelled. */ })
    carrier.end(envelope)
    try {
      await vi.waitFor(() => expect(f.dispatch).toHaveBeenCalledOnce())
      carrier.destroy()
      await vi.waitFor(() => expect(aborted).toBe(1))
    } finally {
      carrier.destroy()
      await f.gateway.close()
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    }
  })

  it.each(['super-admin', 'member'])('filters real WebSocket waterfalls for %s and closes a revoked login', async role => {
    const f = fixture()
    f.account.role = role
    const event = role === 'super-admin' ? 'approval/request' : 'user-questions/request'
    const server = createServer((req, res) => { void f.gateway.handle(req, res) })
    server.on('upgrade', (req, socket, head) => { void f.gateway.upgrade(req, socket, head) })
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const address = server.address()
    if (address === null || typeof address === 'string') throw new Error('Missing port')
    const socket = new WebSocket(`ws://127.0.0.1:${address.port}/api/remote.mux`, { headers: { Cookie: 'chatroom-auth=alice-token' } })
    const seen: string[] = []
    socket.on('message', value => seen.push(String(value)))
    try {
      await once(socket, 'open')
      socket.send(JSON.stringify({ type: 'open', streamId: 'events', endpoint: '$events', payload: { args: {} } }))
      await f.ready.promise
      f.push({ type: 'ready', clientId: 'client-a', host: { home: '/home' } })
      f.push({ type: 'waterfall', event: 'approval/request', eventId: 'foreign', agentId: 'bob-solo', request: {} })
      if (role === 'member') f.push({ type: 'waterfall', event: 'approval/request', eventId: 'denied-approval', agentId: 'alice-solo', request: {} })
      f.push({ type: 'waterfall', event, eventId: 'owned-approval', agentId: 'alice-solo', request: {} })
      await vi.waitFor(() => expect(seen).toHaveLength(2))
      expect(seen[1]).toContain('owned-approval')
      expect(seen.join()).not.toContain('bob-solo')
      expect(seen.join()).not.toContain('denied-approval')
      expect((await f.gateway.fetch(rpc('$events/result', { clientId: 'client-a', eventId: 'denied-approval' }))).status).toBe(403)
      const result = { clientId: 'client-a', eventId: 'owned-approval', outcome: { kind: 'result', value: {} } }
      const answers = await Promise.all(Array.from({ length: 16 }, () => f.gateway.fetch(rpc('$events/result', result))))
      expect(answers.map(answer => answer.status).sort()).toEqual([200, ...Array(15).fill(403)])
      expect(f.dispatch).toHaveBeenCalledTimes(1)
      expect((await f.gateway.fetch(rpc('$events/result', result))).status).toBe(403)
      f.push({ type: 'waterfall', event, eventId: 'unanswered', agentId: 'alice-solo', request: {} })
      await vi.waitFor(() => expect(seen).toHaveLength(3))
      socket.send(JSON.stringify({ type: 'cancel', streamId: 'events' }))
      await f.eventsClosed.promise
      await new Promise<void>(resolve => setImmediate(resolve))
      expect(socket.readyState).toBe(WebSocket.OPEN)
      expect((await f.gateway.fetch(rpc('$events/result', { ...result, eventId: 'unanswered' }))).status).toBe(403)
      socket.send(JSON.stringify({ type: 'open', streamId: 'events-2', endpoint: '$events', payload: { args: {} } }))
      f.push({ type: 'ready', clientId: 'client-b', host: { home: '/home' } })
      f.push({ type: 'waterfall', event, eventId: 'unanswered', agentId: 'alice-solo', request: {} })
      await vi.waitFor(() => expect(seen).toHaveLength(5))
      expect((await f.gateway.fetch(rpc('$events/result', { ...result, clientId: 'client-b', eventId: 'unanswered' }))).status).toBe(200)
      f.revoke()
      const closed = once(socket, 'close')
      f.push({ type: 'emit', event: 'api-session/status', args: ['alice-solo', 'running'] })
      await closed
      expect(seen).toHaveLength(5)
    } finally {
      socket.terminate()
      await f.gateway.close()
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    }
  })
})
