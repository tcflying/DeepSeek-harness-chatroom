import { describe, expect, it, vi } from 'vitest'
import { SessionId, type SessionHeader } from '@deepseek-ai/dsh-session'
import { inspectSession, listSessionHeaders } from '../src/persistence-compat.js'
const header = { id: SessionId('compat-test') } as SessionHeader
describe('session persistence cohort compatibility', () => {
  it('normalizes legacy headers and revision snapshots', async () => {
    expect(await listSessionHeaders({ list: async () => [header] })).toEqual([header])
    expect(await listSessionHeaders({ list: async () => [{ header }] })).toEqual([header])
  })
  it('retains legacy inspection', async () => {
    const inspect = vi.fn(async () => ({ meta: header, events: [] }))
    expect(await inspectSession({ list: async () => [], inspect }, header.id)).toEqual({ meta: header, events: [] })
    expect(inspect).toHaveBeenCalledWith(header.id)
  })
  it('opens read-only and closes the handle', async () => {
    const close = vi.fn(async () => {})
    const open = vi.fn(async () => ({ header, read: async () => ({ events: [] }), close }))
    expect(await inspectSession({ list: async () => [], open }, header.id)).toEqual({ meta: header, events: [] })
    expect(open).toHaveBeenCalledWith(header.id, 'read')
    expect(close).toHaveBeenCalledOnce()
  })
  it('closes after a read failure', async () => {
    const close = vi.fn(async () => {})
    const open = async () => ({ header, read: async () => { throw new Error('read failed') }, close })
    await expect(inspectSession({ list: async () => [], open }, header.id)).rejects.toThrow('read failed')
    expect(close).toHaveBeenCalledOnce()
  })
})
