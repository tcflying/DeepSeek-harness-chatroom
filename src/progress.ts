import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { ChatroomModelProgress } from './types.js'

export interface ProgressCursor {
  value: ChatroomModelProgress
  block: string
  line: string
  publishedAt: number
}

/** Keep a bounded, transient last line; never publish tool arguments or results. */
export function projectModelProgress(previous: ProgressCursor | undefined, event: SessionEvent,
  identity: Pick<ChatroomModelProgress, 'roomId' | 'sessionId' | 'name'>): ProgressCursor | undefined {
  if (!['turn/start', 'turn/end', 'step/start', 'assistant/chunk', 'tool/call', 'tool/result'].includes(event.type)) return undefined
  if (previous && event.seq <= previous.value.seq) return undefined
  const now = event.time
  const value: ChatroomModelProgress = previous?.value ?? {
    ...identity, seq: event.seq, status: 'waiting', text: '等待模型响应…', startedAt: now, updatedAt: now,
  }
  let status = value.status
  let text = value.text
  let block = previous?.block ?? ''
  let line = previous?.line ?? ''
  let startedAt = value.startedAt
  if (event.type === 'turn/start') {
    status = 'waiting'; text = '等待模型响应…'; block = ''; line = ''; startedAt = now
  } else if (event.type === 'step/start') {
    status = 'waiting'; text = '等待模型下一步响应…'; block = ''; line = ''
  } else if (event.type === 'tool/call') {
    status = 'tool'; text = `正在执行 ${event.data.name.slice(0, 80)}`
  } else if (event.type === 'tool/result') {
    status = 'waiting'; text = event.data.error ? '工具返回错误，等待模型处理…' : '工具已返回，等待模型继续…'
  } else if (event.type === 'turn/end') {
    status = event.data.reason.kind === 'error' ? 'failed' : event.data.reason.kind === 'completed' ? 'completed' : 'stopped'
    if (status === 'failed') text = '运行失败，请查看本轮错误提示'
    else if (status === 'stopped') text = '本轮已停止'
  } else if (event.type === 'assistant/chunk') {
    const chunk = event.data.chunk
    if (chunk.type !== 'text-delta' && chunk.type !== 'reasoning-delta') return undefined
    const key = `${event.data.turn}:${event.data.step}:${chunk.index}:${chunk.type}`
    if (key !== block) { block = key; line = '' }
    const joined = (line + chunk.text).slice(-1400).replace(/\r/g, '\n')
    const lines = joined.split('\n')
    line = lines.at(-1) ?? ''
    const last = lines.findLast(part => part.trim() !== '')?.trim()
    status = chunk.type === 'reasoning-delta' ? 'thinking' : 'writing'
    if (last) text = last.slice(-240)
  }
  return { value: { ...identity, seq: event.seq, status, text, startedAt, updatedAt: now }, block, line,
    publishedAt: previous?.publishedAt ?? 0 }
}
