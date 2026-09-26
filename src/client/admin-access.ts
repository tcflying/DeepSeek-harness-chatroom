import type { ChatroomView } from './store.js'

/** Fail closed while identity is loading; room roles and old allowlists are not admin grants. */
export function isPlatformAdmin(view: Pick<ChatroomView, 'phase' | 'auth'>): boolean {
  return view.phase === 'ready' && (!view.auth.enabled || (view.auth.authenticated
    && view.auth.account?.role === 'super-admin' && view.auth.account.status === 'active'))
}

/** Preserve the explicitly unauthenticated legacy mode without granting authenticated room roles. */
export function canManageRoomUi(view: ChatroomView): boolean {
  if (view.auth.enabled) return isPlatformAdmin(view)
  const role = view.members.find(member => member.participantId === view.identity?.participantId)?.role
  return role === 'owner' || role === 'admin' || view.room?.canManageAgents === true
}

/** A native slot election unmounts the entire settings shell, including an open modal. */
export function watchAdminAccess(store: {
  getSnapshot(): ChatroomView
  subscribe(listener: () => void): () => void
}, restrict: () => () => void): () => void {
  let restore: (() => void) | undefined
  const sync = () => {
    if (isPlatformAdmin(store.getSnapshot())) { restore?.(); restore = undefined }
    else restore ??= restrict()
  }
  const unsubscribe = store.subscribe(sync)
  sync()
  return () => { unsubscribe(); restore?.() }
}

/** The host access picker has no public slot. Hide its documented accessible
 * labels in the plugin stylesheet; the native gateway independently rejects
 * permission/model/preset commands. No polling or host source mutation. */
export function watchAdminControls(store: Parameters<typeof watchAdminAccess>[0], root: HTMLElement): () => void {
  return watchAdminAccess(store, () => {
    root.setAttribute('data-dsh-chatroom-restricted', '')
    return () => root.removeAttribute('data-dsh-chatroom-restricted')
  })
}
