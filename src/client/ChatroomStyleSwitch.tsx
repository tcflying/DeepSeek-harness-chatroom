import { useSyncExternalStore } from 'react'

export const CHATROOM_STYLE_KEY = 'dsh-chatroom.style.v1'
export type ChatroomStyle = 'default' | 'qq2007'
type StyleState = { style: ChatroomStyle; persistent: boolean }

/** Browser-local preference. Never changes Harness' own light/dark preference. */
export function createChatroomStyleStore() {
  let state: StyleState = { style: 'qq2007', persistent: true }
  const listeners = new Set<() => void>()
  const publish = (style: ChatroomStyle, persistent = true) => {
    state = { style, persistent }
    if (style === 'default') document.documentElement.removeAttribute('data-dsh-chatroom-style')
    else document.documentElement.setAttribute('data-dsh-chatroom-style', style)
    for (const listener of listeners) listener()
  }
  const read = (): ChatroomStyle => localStorage.getItem(CHATROOM_STYLE_KEY) === 'default' ? 'default' : 'qq2007'
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    set: (style: ChatroomStyle) => {
      let persistent = true
      try { localStorage.setItem(CHATROOM_STYLE_KEY, style) } catch { persistent = false }
      publish(style, persistent)
    },
    install: () => {
      try { publish(read()) } catch { publish('qq2007', false) }
      const onStorage = (event: StorageEvent) => {
        if (event.key !== CHATROOM_STYLE_KEY && event.key !== null) return
        try { publish(read()) } catch { /* Keep the visible preference if storage is unavailable. */ }
      }
      window.addEventListener('storage', onStorage)
      return () => {
        window.removeEventListener('storage', onStorage)
        document.documentElement.removeAttribute('data-dsh-chatroom-style')
      }
    },
  }
}

export function ChatroomStyleSwitch({ styles, fallback = false }: {
  styles: ReturnType<typeof createChatroomStyleStore>
  fallback?: boolean
}): JSX.Element {
  const state = useSyncExternalStore(styles.subscribe, styles.getSnapshot)
  return <label className={`dsh-chatroom-style-switch${fallback ? ' dsh-chatroom-style-fallback' : ''}`}>
    <span aria-hidden="true">◈</span><span>风格</span>
    <select aria-label="界面风格" value={state.style} onChange={event => styles.set(event.target.value === 'qq2007' ? 'qq2007' : 'default')}>
      <option value="qq2007">QQ2007</option>
      <option value="default">原生</option>
    </select>
    {!state.persistent && <span role="status" title="浏览器未允许保存风格，当前页面仍可使用">本次有效</span>}
  </label>
}

/** Native sidebar actions stay native; this only closes the narrow-screen drawer. */
export function ChatroomSidebarBackdrop({ close }: { close: () => void }): JSX.Element {
  return <button className="dsh-chatroom-sidebar-backdrop" aria-label="关闭会话列表" onClick={close} />
}
