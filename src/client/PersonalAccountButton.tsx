import type { ChatroomView } from './store.js'
export function PersonalAccountButton({ useChatroom, openAccount, wide }: {
  useChatroom<T>(selector: (view: ChatroomView) => T): T
  openAccount(): void
  wide: boolean
}): JSX.Element | null {
  const view = useChatroom(value => value)
  if (view.phase !== 'ready' || !view.auth.enabled || !view.auth.authenticated) return null
  return <button type="button" className="dsh-chatroom-personal-account" aria-label="我的账号" title="我的账号" onClick={openAccount}>
    <span aria-hidden>♙</span>{wide && '我的账号'}
  </button>
}
