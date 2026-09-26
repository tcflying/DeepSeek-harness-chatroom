import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
// @ts-expect-error Deployment-only JavaScript observer is intentionally not part of the plugin bundle.
import { environmentProxyMode, needsEnvironmentProxy, observe, probe, supportsEnvironmentProxy } from '../scripts/chatroom-health-observer.mjs'
const roots: string[] = []
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }) })
async function root() { const path = await mkdtemp(join(tmpdir(), 'chatroom-observer-')); roots.push(path); return path }
it('never considers an HTML 200 or wrong-service response healthy', async () => {
  expect(await probe('opencodex', 'http://localhost/healthz', async () => new Response('<html/>'))).toMatchObject({ healthy: false })
  expect(await probe('opencodex', 'http://localhost/healthz', async () => new Response(JSON.stringify({ ready: true })))).toMatchObject({ healthy: false })
  expect(await probe('opencodex', 'http://localhost/healthz', async () => new Response(JSON.stringify({ status: 'ok', service: 'opencodex', pid: 22 })))).toMatchObject({ healthy: true, pid: 22 })
  expect(await probe('origin-bridge', 'http://localhost/__bridge_health', async () => new Response(JSON.stringify({ ready: true, pid: 23, upstreamActive: 12, upstreamErrors: 0 })))).toMatchObject({ healthy: true, pid: 23, upstreamActive: 12, upstreamErrors: 0 })
})
it('only requests Node startup proxy support when an existing proxy is configured', () => {
  expect(needsEnvironmentProxy({ HTTPS_PROXY: 'http://127.0.0.1:7890' })).toBe(true)
  expect(needsEnvironmentProxy({ HTTPS_PROXY: 'http://127.0.0.1:7890', NODE_USE_ENV_PROXY: '1' })).toBe(false)
  expect(needsEnvironmentProxy({ NO_PROXY: 'localhost,127.0.0.1' })).toBe(false)
})
it('only enables environment proxy on Node releases that implement it', () => {
  expect(supportsEnvironmentProxy('22.19.0')).toBe(false)
  expect(supportsEnvironmentProxy('22.21.0')).toBe(true)
  expect(supportsEnvironmentProxy('24.0.0')).toBe(true)
  expect(environmentProxyMode({ HTTPS_PROXY: 'http://127.0.0.1:7890' }, '22.19.0')).toBe('unsupported')
  expect(environmentProxyMode({ HTTPS_PROXY: 'http://127.0.0.1:7890' }, '24.0.0')).toBe('restart-required')
  expect(environmentProxyMode({ HTTPS_PROXY: 'http://127.0.0.1:7890', NODE_USE_ENV_PROXY: '1' }, '22.19.0')).toBe('unsupported')
  expect(environmentProxyMode({ HTTPS_PROXY: 'http://127.0.0.1:7890', NODE_USE_ENV_PROXY: '1' }, '24.0.0')).toBe('enabled')
})
it('records proxy capability absence locally instead of calling the public service unhealthy', async () => {
  const directory = await root()
  const journal = join(directory, 'journal')
  await mkdir(journal)
  const request = async (url: RequestInfo | URL) => {
    if (String(url).includes('talk.opcvip.net')) throw new Error('public probe must be skipped')
    return new Response(JSON.stringify(String(url).includes('10100')
      ? { status: 'ok', service: 'opencodex', pid: 1 }
      : String(url).includes('3185')
        ? { ready: true, pid: 2, upstreamActive: 0, upstreamErrors: 0, websocketOpened: 0, websocketClosed: 0 }
        : { ready: true, diagnostics: { enabled: true, healthy: true, dropped: 0 } }))
  }
  const result = await observe(join(directory, 'observer'), journal, request, { publicProbe: 'proxy-unsupported', nodeVersion: '22.19.0' })
  expect(result).toMatchObject({ services: expect.arrayContaining([{ name: 'chatroom-public', observed: false, reason: 'proxy-unsupported' }]), localDiagnostic: { code: 'proxy-unsupported', nodeVersion: '22.19.0' } })
  expect(result.newFailureCount).toBe(0)
})
it('reports a new native session catalogue deadline and sanitized client failure without altering observer policy', async () => {
  const directory = await root()
  const journal = join(directory, 'journal')
  await mkdir(journal)
  const at = new Date(Date.now() + 1000).toISOString()
  await writeFile(join(journal, 'events.jsonl'), [
    { version: 1, at, event: 'native.session-list.timeout', elapsedMs: 30_000, error: { kind: 'TimeoutError', httpStatus: 504 } },
    { version: 1, at, event: 'client.runtime.failure', clientRuntime: { source: 'window-error' }, error: { kind: 'RangeError' } },
    { version: 1, at, event: 'room.select.stage', roomSelection: { stage: 'response', outcome: 'failure', elapsedMs: 30000, closed: true } },
    { version: 1, at, event: 'room.select.stage', roomSelection: { stage: 'response', outcome: 'complete', elapsedMs: 25 } },
  ].map(record => JSON.stringify(record)).join('\n') + '\n')
  const result = await observe(join(directory, 'observer'), journal, async (url: RequestInfo | URL) => new Response(JSON.stringify(String(url).includes('10100')
    ? { status: 'ok', service: 'opencodex', pid: 1 }
    : String(url).includes('3185')
      ? { ready: true, pid: 2, upstreamActive: 0, upstreamErrors: 0, websocketOpened: 0, websocketClosed: 0 }
      : { ready: true, diagnostics: { enabled: true, healthy: true, dropped: 0 } })))
  expect(result).toMatchObject({ newFailureCount: 3, newFailures: [
    { event: 'native.session-list.timeout', elapsedMs: 30_000, error: { httpStatus: 504 } },
    { event: 'client.runtime.failure', clientRuntime: { source: 'window-error' }, error: { kind: 'RangeError' } },
    { event: 'room.select.stage', roomSelection: { stage: 'response', outcome: 'failure', closed: true } },
  ] })
})

it('does not call a long paused backlog current transport flapping', async () => {
  const directory = await root()
  const journal = join(directory, 'journal'), observer = join(directory, 'observer')
  await mkdir(journal); await mkdir(observer)
  const oldAt = new Date(Date.now() - 3_600_000).toISOString()
  await writeFile(join(observer, 'latest.json'), JSON.stringify({ at: new Date(Date.now() - 86_400_000).toISOString() }))
  await writeFile(join(journal, 'events.jsonl'), [
    ...Array.from({ length: 3 }, () => ({ at: oldAt, event: 'native.close', reason: 'peer-end', elapsedMs: 1000 })),
    { at: oldAt, event: 'image.failure', error: { kind: 'TypeError' } },
  ].map(record => JSON.stringify(record)).join('\n'))
  const result = await observe(observer, journal, async () => new Response(JSON.stringify({ ready: true })))
  expect(result.transport).toMatchObject({ closes: 0, shortCloses: 0, flapping: false, windowSeconds: 300 })
  expect(result.newFailureCount).toBe(1) // Historical failures must still be retained.
})

it('measures a recent transport burst on the first observation, excluding planned stops and invalid durations', async () => {
  const directory = await root()
  const journal = join(directory, 'journal')
  await mkdir(journal)
  const at = new Date(Date.now() - 1000).toISOString()
  await writeFile(join(journal, 'events.jsonl'), [
    ...Array.from({ length: 3 }, () => ({ at, event: 'native.close', reason: 'peer-end', elapsedMs: 1000 })),
    { at, event: 'native.close', reason: 'plugin-stop', elapsedMs: 1000 },
    { at, event: 'native.close', reason: 'peer-end', elapsedMs: -1 },
    { at: 'invalid', event: 'native.close', reason: 'peer-end', elapsedMs: 1000 },
  ].map(record => JSON.stringify(record)).join('\n'))
  const result = await observe(join(directory, 'observer'), journal, async () => new Response(JSON.stringify({ ready: true })))
  expect(result.transport).toMatchObject({ closes: 4, shortCloses: 3, flapping: true, windowSeconds: 300 })
})

it('keeps writing evidence when the bridge is unavailable and no prior PID exists', async () => {
  const directory = await root()
  const result = await observe(join(directory, 'observer'), join(directory, 'missing-journal'), async () => { throw new TypeError('offline') })
  expect(result.origin).toEqual({ possibleLeak: false, newUpstreamErrors: 0 })
  expect(result.services.every((service: { healthy: boolean }) => service.healthy === false)).toBe(true)
})
