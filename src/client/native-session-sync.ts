import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type { ChatroomClientStore } from './store.js'

export type NativeSessionSyncStop = (() => void) & { retry(): void }

/** Bootstrap the account-filtered native catalogue even if the host reset event was missed.
 * One pull per authenticated identity/generation; the native service coalesces concurrent pulls.
 * No polling and no synthetic session rows or permission grants.
 */
export function watchNativeSessionSync(
  store: Pick<ChatroomClientStore, 'getSnapshot' | 'subscribe'>,
  connection: Pick<ConnectionHandle, 'generation'>,
  refresh: () => Promise<void>,
): NativeSessionSyncStop {
  let desiredKey: string | undefined
  let requestedKey: string | undefined
  let principal: string | undefined
  let disposed = false
  let refreshPending = false
  let authenticated = false
  let authenticationEpoch = 0
  // Keep only the latest explicit request made while the native catalogue is
  // still settling.  It is revalidated against the live identity below.
  let queuedExplicitRetry: { key: string; authenticationEpoch: number } | undefined
  const requestRefresh = (next: string, force = false) => {
    if (disposed) return
    if (refreshPending) {
      if (force) queuedExplicitRetry = { key: next, authenticationEpoch }
      return
    }
    if (!force && requestedKey === next) return
    requestedKey = next
    refreshPending = true
    // The native list store owns read failures.  A user may explicitly retry
    // after it settles; never turn ordinary store emissions into polling.
    void refresh().catch(() => {}).finally(() => {
      refreshPending = false
      if (disposed) return
      const view = store.getSnapshot()
      const generation = connection.generation.getSnapshot()
      const currentKey = view.phase === 'ready' && view.identity !== undefined
        ? `${view.identity.participantId}:${generation?.id ?? 'initial'}`
        : undefined
      const explicitRetry = queuedExplicitRetry
      queuedExplicitRetry = undefined
      // A manual reconnect asked for while a deadline was in flight must not
      // be lost, but must not cross logout, identity, or generation boundaries.
      if (explicitRetry?.authenticationEpoch === authenticationEpoch && explicitRetry.key === currentKey) {
        desiredKey = currentKey
        principal = view.identity!.participantId
        requestRefresh(currentKey, true)
        return
      }
      // A new identity/generation observed while this read was pending gets
      // exactly one trailing pull.  The same failed key is never retried here.
      if (desiredKey !== requestedKey) sync()
    })
  }
  const sync = (): void => {
    const view = store.getSnapshot()
    const generation = connection.generation.getSnapshot()
    if (disposed) return
    if (view.phase !== 'ready' || view.identity === undefined) {
      // An auth boundary invalidates a queued user action even if the same
      // participant later signs back in before an old read settles.
      if (authenticated) {
        authenticated = false
        authenticationEpoch += 1
        queuedExplicitRetry = undefined
        desiredKey = undefined
        requestedKey = undefined
        principal = undefined
      }
      return
    }
    authenticated = true
    // HTTP catalogue reads are usable before the event stream handshake settles.
    // Do not leave an already authenticated browser empty while waiting for WS.
    const next = `${view.identity.participantId}:${generation?.id ?? 'initial'}`
    if (generation === undefined && principal === view.identity.participantId && requestedKey === next) return
    desiredKey = next
    principal = view.identity.participantId
    requestRefresh(next)
  }
  const offStore = store.subscribe(sync)
  const offGeneration = connection.generation.subscribe(sync)
  sync()
  const stop = (() => { disposed = true; offStore(); offGeneration() }) as NativeSessionSyncStop
  stop.retry = () => {
    const view = store.getSnapshot()
    if (view.phase !== 'ready' || view.identity === undefined) return
    const generation = connection.generation.getSnapshot()
    const next = `${view.identity.participantId}:${generation?.id ?? 'initial'}`
    desiredKey = next
    principal = view.identity.participantId
    requestRefresh(next, true)
  }
  return stop
}
