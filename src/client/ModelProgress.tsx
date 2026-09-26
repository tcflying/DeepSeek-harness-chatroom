import { useEffect, useState } from 'react'
import type { ChatroomModelProgress } from '../types.js'
import type { ChatroomView } from './store.js'
import { usePageVisible } from './media-lifecycle.js'

const labels: Record<ChatroomModelProgress['status'], string> = {
  waiting: '等待响应', thinking: '正在思考', writing: '正在回复', tool: '正在执行',
  completed: '已完成', failed: '运行失败', stopped: '已停止',
}
const active = (item: ChatroomModelProgress) => ['waiting', 'thinking', 'writing', 'tool'].includes(item.status)

/** Uses event timestamps, not a spinner, as evidence of model progress. */
export function ModelProgress({ useChatroom, session }: {
  useChatroom<T>(selector: (view: ChatroomView) => T): T
  session?: { readonly sessionId: string }
}): JSX.Element | null {
  const sessionId = session?.sessionId
  const view = useChatroom(value => value)
  const visible = usePageVisible()
  const [now, setNow] = useState(Date.now)
  const showing = view.phase === 'ready' && !view.directOpen
  const progress = showing ? (view.modelProgress ?? []).filter(item => item.roomId === view.room?.id
    && (item.sessionId === sessionId || (sessionId === view.room?.sessionId && item.sessionId.startsWith('chatroom-agent-'))))
    : []
  const ticking = progress.some(item => active(item) || now - item.updatedAt < 15000)
  useEffect(() => {
    if (!visible || !ticking) return
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [visible, ticking])
  if (!showing) return null
  const rows = progress.filter(item => active(item) || now - item.updatedAt < 15000)
  if (rows.length === 0) return null
  return <section className="dsh-chatroom-model-progress" aria-label="模型实时进展">
    {rows.map(item => {
      const elapsed = Math.max(0, Math.floor((now - item.updatedAt) / 1000))
      const running = active(item)
      const stalled = running && elapsed >= 30
      return <div key={item.sessionId} className="dsh-chatroom-progress-row" data-state={item.status} data-stalled={stalled}>
        <span className="dsh-chatroom-progress-dot" aria-hidden />
        <strong title={item.name}><span className="dsh-chatroom-progress-name">{item.name}</span>
          <span aria-hidden> · </span><span className="dsh-chatroom-progress-state">{labels[item.status]}</span></strong>
        <span className="dsh-chatroom-progress-line" title={item.text}>{item.text}</span>
        <small>{!running ? labels[item.status] : view.connection !== 'online' ? '连接中断，进展待同步'
          : stalled ? `${elapsed} 秒无新进展，可能正在等待工具或模型` : elapsed < 2 ? '刚刚更新' : `${elapsed} 秒前更新`}</small>
      </div>
    })}
  </section>
}
