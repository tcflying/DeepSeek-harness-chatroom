import { expect, it } from 'vitest'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { projectModelProgress, type ProgressCursor } from '../src/progress.js'

const identity = { roomId: 'room', sessionId: 'session', name: 'M3' }
const event = (type: string, seq: number, data: object): SessionEvent => ({ type, seq, time: 1000 + seq, data }) as SessionEvent
const chunk = (seq: number, text: string, type = 'reasoning-delta', index = 0) => event('assistant/chunk', seq,
  { turn: 1, step: 1, chunk: { type, index, text } })

it('projects actual deltas as the bounded last line, switches blocks and ignores replays', () => {
  let cursor = projectModelProgress(undefined, event('turn/start', 1, { turn: 1 }), identity)!
  expect(cursor.value.status).toBe('waiting')
  cursor = projectModelProgress(cursor, chunk(2, '第一行\n正在'), identity)!
  cursor = projectModelProgress(cursor, chunk(3, '验证\n'), identity)!
  expect(cursor.value).toMatchObject({ status: 'thinking', text: '正在验证', updatedAt: 1003, startedAt: 1001 })
  expect(projectModelProgress(cursor, chunk(2, '过时数据'), identity)).toBeUndefined()
  cursor = projectModelProgress(cursor, chunk(4, '答复', 'text-delta', 1), identity)!
  expect(cursor.value).toMatchObject({ status: 'writing', text: '答复' })
  cursor = projectModelProgress(cursor, chunk(5, '字'.repeat(5000), 'text-delta', 1), identity)!
  expect(cursor.line.length).toBeLessThanOrEqual(1400)
  expect(cursor.value.text.length).toBe(240)
  cursor = projectModelProgress(cursor, event('turn/end', 6, { turn: 1, reason: { kind: 'completed' } }), identity)!
  expect(cursor.value.status).toBe('completed')
  expect(projectModelProgress(cursor, event('turn/start', 7, { turn: 2 }), identity)?.value).toMatchObject({ status: 'waiting', startedAt: 1007 })
})

it('does not expose tool payloads and reports tool failures or turn cancellation truthfully', () => {
  let cursor: ProgressCursor | undefined
  cursor = projectModelProgress(cursor, event('tool/call', 1, { name: 'draw', arguments: { token: 'secret' } }), identity)!
  expect(cursor.value.text).toBe('正在执行 draw')
  cursor = projectModelProgress(cursor, event('tool/result', 2, { error: 'private error', message: 'secret' }), identity)!
  expect(cursor.value.text).toBe('工具返回错误，等待模型处理…')
  expect(JSON.stringify(cursor)).not.toContain('secret')
  expect(projectModelProgress(cursor, event('turn/end', 3, { reason: { kind: 'error', error: 'secret' } }), identity)?.value.status).toBe('failed')
  expect(projectModelProgress(cursor, event('turn/end', 3, { reason: { kind: 'aborted' } }), identity)?.value.status).toBe('stopped')
  expect(projectModelProgress(cursor, chunk(3, 'secret', 'tool-call-delta'), identity)).toBeUndefined()
})
