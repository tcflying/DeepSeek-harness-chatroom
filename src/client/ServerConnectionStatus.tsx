import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ChatroomClientStore } from './store.js'
import { CHATROOM_RECONNECTED } from './RecoverableImage.js'
import { CHATROOM_API_PREFIX } from '../routes.js'

// Mirror the pinned host's native footer contract, without shipping another sidebar.
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'sidebar.settings': { kind: 'single'; scope: 'root'; owner: { wide: boolean } }
    'sidebar.footer.action': { kind: 'list'; scope: 'root'; owner: { wide: boolean } }
  }
}

type NativeCatalogue = {
  subscribe(listener: () => void): () => void
  getSnapshot(): Pick<SessionListState, 'phase'>
}

// Older hosts/tests can omit this read-only feed; production injects sessions.list.
const readyCatalogueSnapshot: Pick<SessionListState, 'phase'> = { phase: 'ready' }
const readyNativeCatalogue: NativeCatalogue = {
  subscribe: () => () => undefined,
  getSnapshot: () => readyCatalogueSnapshot,
}

export function ServerConnectionStatus({ wide, connection, store, nativeCatalogue = readyNativeCatalogue }: {
  wide: boolean
  connection: Pick<ConnectionHandle, 'state' | 'reconnect'>
  store: Pick<ChatroomClientStore, 'subscribe' | 'getSnapshot' | 'reconnect'>
  nativeCatalogue?: NativeCatalogue
}): JSX.Element {
  const native = useSyncExternalStore(connection.state.subscribe, connection.state.getSnapshot)
  const room = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const catalogue = useSyncExternalStore(nativeCatalogue.subscribe, nativeCatalogue.getSnapshot)
  const [online, setOnline] = useState(() => navigator.onLine)
  const [visible, setVisible] = useState(() => document.visibilityState !== 'hidden')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [slow, setSlow] = useState(false)
  const pending = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    if (!visible || !online || room.identity === undefined || room.phase !== 'ready') return
    // Debounce transient states; no prompts, cookies, room names or raw errors in the journal.
    const controller = new AbortController()
    const timer = setTimeout(() => {
      void fetch(`${CHATROOM_API_PREFIX}/connection/diagnostic`, { method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ native, room: room.connection, notifications: room.notificationConnection, visible, online }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(4000)]),
      }).then(response => response.body?.cancel()).catch(() => {})
    }, 2000)
    return () => { clearTimeout(timer); controller.abort() }
  }, [native, room.connection, room.notificationConnection, room.identity?.participantId, room.phase, visible, online])
  useEffect(() => {
    mounted.current = true
    const network = () => setOnline(navigator.onLine)
    const visibility = () => setVisible(document.visibilityState !== 'hidden')
    window.addEventListener('online', network)
    window.addEventListener('offline', network)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      mounted.current = false
      window.removeEventListener('online', network)
      window.removeEventListener('offline', network)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])
  const auth = room.phase === 'auth-required' || room.phase === 'identity-required'
  const cataloguePending = catalogue.phase === 'pending'
  const syncing = cataloguePending || native !== 'connected' || room.phase !== 'ready'
    || (room.branchFrame === undefined && (room.notificationConnection !== 'online'
      || (room.room !== undefined && room.connection !== 'online')))
  useEffect(() => {
    // A failed manual attempt must not override later observed stream recovery.
    if (failed && online && !syncing) setFailed(false)
  }, [failed, online, syncing])
  useEffect(() => {
    setSlow(false)
    if (!syncing || !online || !visible || auth) return
    const timer = setTimeout(() => setSlow(true), 15_000)
    return () => clearTimeout(timer)
  }, [syncing, online, visible, auth])
  const status = !online ? 'offline' : auth ? 'auth' : !visible ? 'paused'
    : failed || native === 'disconnected' || room.phase === 'error' || slow ? 'offline'
      : busy || syncing ? 'connecting' : 'connected'
  const label = !online ? '网络离线' : auth ? '请先登录 / 加入' : !visible ? '后台暂停同步'
    : cataloguePending && slow ? '目录同步超时 · 请重连'
      : status === 'connected' ? '服务器已连接'
        : status === 'connecting' ? (cataloguePending ? '正在同步会话目录' : '服务器连接中')
          : slow ? '连接超时 · 请重连' : '服务器未连接'
  const reconnect = async () => {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setFailed(false)
    try {
      connection.reconnect()
      await store.reconnect()
      if (store.getSnapshot().phase === 'ready') window.dispatchEvent(new Event(CHATROOM_RECONNECTED))
    } catch { if (mounted.current) setFailed(true) }
    finally {
      pending.current = false
      if (mounted.current) setBusy(false)
    }
  }
  const describe = (value: string | undefined) => value === 'connected' || value === 'online' ? '已连接' : value === 'connecting' ? '连接中' : '未连接'
  const catalogueDetail = cataloguePending
    ? (slow ? '同步超时，未自动重试；点击重连可手动重新同步' : '正在同步')
    : '已就绪'
  const detail = `原生会话：${describe(native)}；会话目录：${catalogueDetail}；群消息：${room.room ? describe(room.connection) : '未选择'}；通知：${describe(room.notificationConnection)}`
  return <div className="dsh-chatroom-server-status" data-wide={wide} data-state={status}
    data-native={native} data-room={room.connection} data-notifications={room.notificationConnection}>
    <span role="status" aria-live="polite" title={`${label}。${detail}。模型和生图服务另行监控。`}>
      <span className="dsh-chatroom-server-dot" aria-hidden="true" />
      <span className="dsh-chatroom-server-label">{label}</span>
    </span>
    <button type="button" aria-label="重新连接服务器" title="重新连接服务器（保留草稿，不重发消息）"
      disabled={busy || !online} onClick={() => { void reconnect() }}>
      <span aria-hidden="true">↻</span><span className="dsh-chatroom-reconnect-label">{busy ? '重连中' : '重连'}</span>
    </button>
  </div>
}
