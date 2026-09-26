import type { ChatroomView } from './store.js'

/** Credentials/principal changes need a new native generation; read recovery does not. */
export function createNativeIdentitySync(reconnect: () => void): (view: {
  phase: ChatroomView['phase']
  identity?: { participantId: string } | undefined
}) => void {
  let participantId: string | undefined
  let credentialsChanged = false
  return view => {
    if (view.phase === 'auth-required' || view.phase === 'identity-required') credentialsChanged = true
    if (view.phase !== 'ready' || view.identity === undefined) return
    const changed = participantId !== undefined && participantId !== view.identity.participantId
    participantId = view.identity.participantId
    if (credentialsChanged || changed) {
      credentialsChanged = false
      reconnect()
    }
  }
}
