import { useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import type { ChatNodeViewProps } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { ChatroomAgentTarget } from './store.js'
import type { ChatroomView } from './store.js'
import type {
  ChatroomForwardItem,
  ChatroomFileReference,
  ChatroomReplyReference,
  ChatroomThreadRoot,
} from '../types.js'
import type { ChatroomReactionEmoji } from '../reactions.js'
import { projectExternalCardText, projectFileText } from '../message.js'
import { projectImageLinks } from './image-links.js'
import { FileCard } from './ChatroomMessageNodeView.js'
import { RecoverableImage } from './RecoverableImage.js'
import { ChatroomExternalCardView } from './ChatroomExternalCard.js'
import { ChatroomAssistantReplyAction } from './ChatroomAssistantReplyAction.js'
import { ChatroomPendingMessageView } from './ChatroomPendingMessage.js'

const COLLAPSIBLE_PROCESS_KINDS = new Set(['assistant-step', 'context', 'retry', 'tool-call'])

export interface ChatroomAssistantNodeViewProps extends ChatNodeViewProps<'assistant-step'> {
  useChatroom<T>(selector: (snapshot: ChatroomView) => T): T
  nativeMessageView: ComponentType<ChatNodeViewProps<'assistant-step'>>
  resolveTarget?(sessionId: string): ChatroomAgentTarget | undefined
  setReply(roomId: string, reply: ChatroomReplyReference): void
  openThread(roomId: string, root: ChatroomThreadRoot): Promise<void>
  toggleReaction(roomId: string, messageId: string, emoji: ChatroomReactionEmoji): Promise<void>
  openForward(roomId: string, message: ChatroomForwardItem): void
  toggleMessageSelection(roomId: string, message: ChatroomForwardItem): void
  recallMessage(roomId: string, messageId: string): Promise<boolean>
  updateQueuedPrompt(
    target: { readonly roomId: string } | { readonly threadId: string },
    messageId: string,
    action: 'guide' | 'delete' | 'edit',
  ): Promise<string | undefined>
}

/** Keep a completed shared-room turn compact while preserving its native process rows. */
export function ChatroomAssistantNodeView(props: ChatroomAssistantNodeViewProps): JSX.Element {
  const NativeMessageView = props.nativeMessageView
  const rootRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const finalNode = props.node.data.finalNode
  const tail = props.useTurnData('turn-tail')
  const target = props.resolveTarget?.(String(props.sessionId))
  const shared = target !== undefined
  const closing = shared
    && finalNode !== undefined
    && tail?.closing?.finalNode.seq === finalNode.seq
  const standaloneMeetingSummaryMessageId = shared
    && finalNode !== undefined
    && !closing
    && props.node.data.blocks.some(block => block.kind === 'text'
      && block.text.trimStart().startsWith('## 会议总结 ·'))
    ? finalNode.messageId
    : undefined
  const standaloneMeetingSummary = standaloneMeetingSummaryMessageId !== undefined
  const latestAssistant = props.useChat((snapshot) => {
    const index = snapshot.order.indexOf(props.node.key)
    if (index < 0) return false
    return snapshot.order.slice(index + 1).every((key) =>
      snapshot.nodes.get(key)?.kind !== 'assistant-step')
  })
  const pendingMessages = props.useChatroom(snapshot => target?.kind === 'room' && latestAssistant
    ? snapshot.pendingMessages.filter(message => message.roomId === target.room.id)
    : [])
  const identity = props.useChatroom(snapshot => snapshot.identity)
  const processSignature = props.useChat((snapshot) => {
    if (!closing) return ''
    const turn = props.node.data.turn
    return snapshot.order.flatMap((key) => {
      const candidate = snapshot.nodes.get(key)
      if (candidate === undefined || candidate.key === props.node.key) return []
      const location = candidate.location
      const candidateTurn = location.kind === 'turn' || location.kind === 'step'
        ? location.turn.turn
        : undefined
      return candidateTurn === turn && COLLAPSIBLE_PROCESS_KINDS.has(candidate.kind)
        ? [candidate.key]
        : []
    }).join('\u0000')
  })
  const processKeys = useMemo(
    () => processSignature === '' ? [] : processSignature.split('\u0000'),
    [processSignature],
  )
  const inlineReasoningCount = closing
    ? props.node.data.blocks.filter(block => block.kind === 'reasoning' && block.text.trim() !== '').length
    : 0
  const processItemCount = processKeys.length + inlineReasoningCount
  const cards = props.node.data.blocks.flatMap(block => block.kind === 'text'
    ? projectExternalCardText(block.text).cards
    : [])
  const projectedBlocks: Array<(typeof props.node.data.blocks)[number]> = []
  const files: ChatroomFileReference[] = []
  const images: { url: string; alt: string }[] = []
  for (const block of props.node.data.blocks) {
    if (block.kind !== 'text') {
      projectedBlocks.push(block)
      continue
    }
    const projection = projectExternalCardText(block.text)
    const fileProjection = shared ? projectFileText(projection.text) : { text: projection.text, files: [] }
    const imageProjection = shared ? projectImageLinks(fileProjection.text, fileProjection.files) : { text: fileProjection.text, images: [] }
    files.push(...fileProjection.files)
    images.push(...imageProjection.images)
    if (imageProjection.text.trim() !== '') projectedBlocks.push({ ...block, text: imageProjection.text })
  }
  const projectedNode: typeof props.node = cards.length + files.length + images.length === 0 ? props.node : {
    ...props.node,
    data: {
      ...props.node.data,
      blocks: projectedBlocks,
    },
  }

  useEffect(() => {
    const root = rootRef.current
    const flow = root?.closest<HTMLElement>('[data-chat-flow]')
    if (root === null || !closing) return
    const keys = new Set(processKeys)
    const processRows = flow === null || flow === undefined
      ? []
      : [...flow.querySelectorAll<HTMLElement>('[data-chat-flow-key]')]
          .filter(row => keys.has(row.dataset.chatFlowKey ?? ''))
    const inlineReasoningRows = [...root.querySelectorAll<HTMLElement>('[data-variant="think"]')]
    const rows = [...processRows, ...inlineReasoningRows].map(row => ({ row, hidden: row.hidden }))
    for (const { row } of rows) {
      row.dataset.dshChatroomProcessRow = ''
      row.hidden = !expanded
    }
    return () => {
      for (const { row, hidden } of rows) {
        row.hidden = hidden
        delete row.dataset.dshChatroomProcessRow
      }
    }
  }, [closing, expanded, processKeys])

  return (
    <div
      className="dsh-chatroom-assistant-turn"
      ref={rootRef}
      data-time-hover-root={standaloneMeetingSummary || undefined}
      data-dsh-chatroom-standalone-assistant={standaloneMeetingSummary || undefined}
    >
      {closing && processItemCount > 0 && (
        <button
          type="button"
          className="dsh-chatroom-process-toggle"
          aria-label={`${expanded ? '收起执行过程' : '执行过程'} · ${processItemCount} 项`}
          aria-expanded={expanded}
          onClick={() => { setExpanded(value => !value) }}
        >
          <span aria-hidden className="dsh-chatroom-process-chevron">⌄</span>
          <span>{expanded ? '收起执行过程' : '执行过程'} · {processItemCount} 项</span>
          {!expanded && <span className="dsh-chatroom-progress-line">{props.node.data.blocks.filter(block => block.kind === 'reasoning').flatMap(block => block.text.split('\n')).findLast(line => line.trim() !== '')?.trim().slice(-160)}</span>}
        </button>
      )}
      <NativeMessageView {...props} node={projectedNode} />
      {files.map((file, index) => <FileCard key={`${file.id}:${index}`} file={file} roomId={target?.room.id} sessionId={String(props.sessionId)} />)}
      {images.map((image, index) => <RecoverableImage key={`${image.url}:${index}`} {...image} roomId={target?.room.id} sessionId={String(props.sessionId)} />)}
      {cards.map((card, index) => <ChatroomExternalCardView card={card} key={`${card.kind}:${card.title}:${index}`} />)}
      {standaloneMeetingSummary && <ChatroomAssistantReplyAction
        {...props}
        messageId={standaloneMeetingSummaryMessageId}
      />}
      {pendingMessages.length > 0 && <div className="dsh-chatroom-pending-stream" aria-label="已发送的排队消息">
        {pendingMessages.map(message => <ChatroomPendingMessageView
          key={message.messageId}
          message={message}
          own={message.participantId === identity?.participantId}
          sessionId={String(props.sessionId)}
          update={props.updateQueuedPrompt}
        />)}
      </div>}
    </div>
  )
}
