import type { SessionHeader, SessionEvent, SessionId } from '@deepseek-ai/dsh-session'

type Inspection = { meta: SessionHeader; events: readonly SessionEvent[] }
type ReadHandle = { header: SessionHeader; read(): Promise<{ events: readonly SessionEvent[] }>; close(): Promise<void> }
type PersistenceReader = {
  list(): Promise<readonly (SessionHeader | { header: SessionHeader })[]>
  inspect?: (id: SessionId) => Promise<Inspection>
  open?: (id: SessionId, access: 'read') => Promise<ReadHandle>
}

/** Normalize old headers and the newer revision-bearing snapshots without changing storage. */
export async function listSessionHeaders(persistence: PersistenceReader): Promise<readonly SessionHeader[]> {
  return (await persistence.list()).map(item => 'header' in item ? item.header : item)
}

/** New read handles never claim write ownership and are closed even if reading fails. */
export async function inspectSession(persistence: PersistenceReader, id: SessionId): Promise<Inspection> {
  if (typeof persistence.inspect === 'function') return persistence.inspect(id)
  if (typeof persistence.open !== 'function') throw new Error('Unsupported session persistence reader')
  const handle = await persistence.open(id, 'read')
  try { return { meta: handle.header, events: (await handle.read()).events } }
  finally { await handle.close() }
}
