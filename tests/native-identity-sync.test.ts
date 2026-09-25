import { expect, it, vi } from 'vitest'
import { createNativeIdentitySync } from '../src/client/native-identity-sync.js'

it('does not tear down the native generation during authenticated bootstrap or same-user read recovery', () => {
  const reconnect = vi.fn(), sync = createNativeIdentitySync(reconnect)
  sync({ phase: 'loading' })
  sync({ phase: 'ready', identity: { participantId: 'alice' } })
  for (const phase of ['loading', 'error', 'ready', 'ready'] as const) sync({ phase, identity: { participantId: 'alice' } })
  expect(reconnect).not.toHaveBeenCalled()
})

it('reconnects once after login even if a loading phase intervenes', () => {
  const reconnect = vi.fn(), sync = createNativeIdentitySync(reconnect)
  sync({ phase: 'auth-required' }); sync({ phase: 'loading' })
  sync({ phase: 'ready', identity: { participantId: 'alice' } })
  sync({ phase: 'ready', identity: { participantId: 'alice' } })
  expect(reconnect).toHaveBeenCalledTimes(1)
})

it('reconnects on guest identity creation and a principal change, but not a profile refresh', () => {
  const reconnect = vi.fn(), sync = createNativeIdentitySync(reconnect)
  sync({ phase: 'identity-required' }); sync({ phase: 'ready', identity: { participantId: 'guest' } })
  sync({ phase: 'ready', identity: { participantId: 'bob' } })
  sync({ phase: 'ready', identity: { participantId: 'bob' } })
  expect(reconnect).toHaveBeenCalledTimes(2)
})

it('does not perform a second native reconnect when the manual reconnect refreshes the same identity', () => {
  const reconnect = vi.fn(), sync = createNativeIdentitySync(reconnect)
  sync({ phase: 'ready', identity: { participantId: 'alice' } })
  reconnect()
  sync({ phase: 'loading', identity: { participantId: 'alice' } })
  sync({ phase: 'ready', identity: { participantId: 'alice' } })
  expect(reconnect).toHaveBeenCalledTimes(1)
})
