import { createRequire } from 'node:module'
import { createServer, get } from 'node:http'
import { once } from 'node:events'
import { expect, it, vi } from 'vitest'
const { createBridge } = createRequire(import.meta.url)('../scripts/chatroom-origin-bridge.cjs')

it('releases upstream SSE reads when clients disconnect and preserves Origin security headers', async () => {
  const received: { origin: string | undefined; site: string; host: string | undefined }[] = []
  const active = new Set<import('node:http').ServerResponse>()
  const target = createServer((req, res) => {
    received.push({ origin: req.headers.origin, site: String(req.headers['sec-fetch-site']), host: req.headers.host })
    active.add(res); res.once('close', () => active.delete(res))
    res.writeHead(200, { 'Content-Type': 'text/event-stream' }); res.write('data: test\n\n')
  })
  target.listen(0, '127.0.0.1'); await once(target, 'listening')
  const bridge = createBridge({ targetPort: (target.address() as import('node:net').AddressInfo).port })
  bridge.server.listen(0, '127.0.0.1'); await once(bridge.server, 'listening')
  const port = bridge.server.address().port
  try {
    for (let i = 0; i < 20; i++) await new Promise<void>((resolve, reject) => {
      const req = get(`http://127.0.0.1:${port}/events`, { headers: { Origin: 'https://evil.test', 'Sec-Fetch-Site': 'cross-site' } }, res => {
        res.once('data', () => { res.destroy(); req.destroy(); resolve() })
      }); req.on('error', reject)
    })
    await vi.waitFor(() => { expect(active.size).toBe(0); expect(bridge.active.size).toBe(0) })
    expect(received).toHaveLength(20)
    expect(received[0]).toEqual({ origin: 'https://evil.test', site: 'cross-site', host: 'talk.opcvip.net' })
  } finally { await bridge.close(); await new Promise<void>(resolve => target.close(() => resolve())) }
})
