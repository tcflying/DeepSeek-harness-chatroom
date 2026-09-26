import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { GalleryItem, GalleryPage } from '../media.js'
import { CHATROOM_API_PREFIX } from '../routes.js'
import { isDialogBackdropClick, mediaThumbnailUrl, usePageVisible } from './media-lifecycle.js'
import type { ImageSelection } from '../image-generation.js'
import { VideoStudio } from './VideoStudio.js'

export interface GalleryScope { roomId?: string | undefined; sessionId?: string | undefined }
const GALLERY_READ_TIMEOUT_MS = 30_000
export function SessionGalleryButton(props: GalleryScope): JSX.Element {
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [props.roomId, props.sessionId])
  return <><button type="button" className="dsh-chatroom-manage-action" onClick={() => setOpen(true)}>▧ 会话图库</button>
    {open && <MediaGallery {...props} close={() => setOpen(false)} />}</>
}

/** Only the selected original is downloaded. Cleanup aborts a pending GET and releases pixels. */
export function GalleryOriginal({ item, editing = false, selection, onSelection }: { item: GalleryItem; editing?: boolean; selection?: ImageSelection | undefined; onSelection?(selection: ImageSelection): void }): JSX.Element {
  const [source, setSource] = useState<string>()
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  const visible = usePageVisible()
  const start = useRef<{ x: number; y: number }>()
  useEffect(() => {
    setSource(undefined); setFailed(false)
    if (!visible) return
    const controller = new AbortController()
    let objectUrl: string | undefined
    void fetch(item.url, { credentials: 'same-origin', signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Original GET failed')
      const blob = await response.blob()
      if (controller.signal.aborted) return
      objectUrl = URL.createObjectURL(blob)
      setSource(objectUrl)
    }).catch(() => { if (!controller.signal.aborted) setFailed(true) })
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [item.url, visible, retry])
  if (!visible) return <p role="status">页面已隐藏，暂停原图加载</p>
  if (failed) return <button type="button" onClick={() => setRetry(value => value + 1)}>原图加载失败 · 点击重试</button>
  return source ? <div className="dsh-chatroom-selection-image"><img src={source} alt={item.name} decoding="async" />
    {editing && <div className="dsh-chatroom-selection-surface" aria-label="拖动框选改图区域"
      onPointerDown={event => {
        event.preventDefault()
        const bounds = event.currentTarget.getBoundingClientRect()
        start.current = { x: (event.clientX - bounds.left) / bounds.width, y: (event.clientY - bounds.top) / bounds.height }
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={event => {
        if (!start.current) return
        const bounds = event.currentTarget.getBoundingClientRect()
        const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width))
        const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height))
        onSelection?.({ x: Math.min(x, start.current.x), y: Math.min(y, start.current.y), width: Math.abs(x - start.current.x), height: Math.abs(y - start.current.y) })
      }} onPointerUp={() => { start.current = undefined }} onPointerCancel={() => { start.current = undefined }}>
      {selection && <div className="dsh-chatroom-selection-rectangle" style={{ left: `${selection.x * 100}%`, top: `${selection.y * 100}%`, width: `${selection.width * 100}%`, height: `${selection.height * 100}%` }} />}
    </div>}</div> : <p role="status">正在加载原图…</p>
}

export function MediaGallery({ roomId, sessionId, initial, close }: GalleryScope & { initial?: GalleryItem; close(): void }): JSX.Element {
  const dialog = useRef<HTMLDialogElement>(null)
  const [items, setItems] = useState<GalleryItem[]>(initial ? [initial] : [])
  const [selectedUrl, setSelectedUrl] = useState(initial?.url)
  const [grid, setGrid] = useState(!initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [retry, setRetry] = useState(0)
  const [editing, setEditing] = useState(false)
  const [selection, setSelection] = useState<ImageSelection>()
  const [prompt, setPrompt] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [editStatus, setEditStatus] = useState('')
  const [videoFileId, setVideoFileId] = useState<string>()
  const sourceRead = useRef<AbortController>()
  const selectionRevision = useRef(0)
  const editAttempt = useRef<{ preparing: boolean; promptSent: boolean }>()
  const cancelledEditNotice = useRef<string>()
  const visible = usePageVisible()
  useEffect(() => {
    const element = dialog.current!
    const previous = document.activeElement as HTMLElement | null
    if (element.showModal) element.showModal(); else element.setAttribute('open', '')
    return () => { element.close?.(); if (previous?.isConnected) previous.focus() }
  }, [])
  useEffect(() => {
    if (!roomId || !sessionId || !visible) return
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(new DOMException('图库读取超时', 'TimeoutError')), GALLERY_READ_TIMEOUT_MS)
    let active = true
    setLoading(true); setError(undefined)
    void (async () => {
      const all = new Map<string, GalleryItem>()
      let offset: number | undefined = 0
      do {
        const response = await fetch(`${CHATROOM_API_PREFIX}/media/gallery?roomId=${encodeURIComponent(roomId)}&sessionId=${encodeURIComponent(sessionId)}&offset=${offset}`, { credentials: 'same-origin', signal: controller.signal })
        if (!response.ok) throw new Error(`图库读取失败（HTTP ${response.status}）`)
        const page = await response.json() as GalleryPage
        controller.signal.throwIfAborted()
        for (const item of page.items) all.set(item.url, item)
        if (page.next !== undefined && page.next <= offset) throw new Error('图库分页游标无效')
        offset = page.next
      } while (offset !== undefined)
      if (!active || controller.signal.aborted) return
      if (initial && !all.has(initial.url)) all.set(initial.url, initial)
      setItems([...all.values()])
    })().catch(cause => {
      if (!active) return
      if (controller.signal.aborted && controller.signal.reason?.name !== 'TimeoutError') return
      const message = cause instanceof Error && /^(图库读取失败|图库分页游标无效)/u.test(cause.message)
        ? cause.message : '图库读取暂时失败，请重试。'
      setError(controller.signal.reason?.name === 'TimeoutError' ? '图库读取超时，请重试。' : message)
    }).finally(() => {
      clearTimeout(timeout)
      if (active && (!controller.signal.aborted || controller.signal.reason?.name === 'TimeoutError')) setLoading(false)
    })
    return () => { active = false; clearTimeout(timeout); controller.abort() }
  }, [roomId, sessionId, visible, retry])
  const index = Math.max(0, items.findIndex(item => item.url === selectedUrl))
  const selected = items[index]
  useEffect(() => {
    setEditing(false); setSelection(undefined); setPrompt(''); setEditStatus(cancelledEditNotice.current ?? ''); cancelledEditNotice.current = undefined
    setSubmitted(false)
    setVideoFileId(undefined)
  }, [selectedUrl])
  useEffect(() => () => sourceRead.current?.abort(), [])
  const releaseEditPreparation = (attempt: { preparing: boolean; promptSent: boolean } | undefined, message: string) => {
    if (!attempt?.preparing || attempt.promptSent) return
    attempt.preparing = false
    if (editAttempt.current !== attempt) return
    cancelledEditNotice.current = message
    setSubmitted(false)
    setEditStatus(message)
  }
  useEffect(() => {
    if (visible) return
    selectionRevision.current += 1
    const attempt = editAttempt.current
    sourceRead.current?.abort()
    sourceRead.current = undefined
    if (attempt?.promptSent && editAttempt.current === attempt) setEditStatus('改图请求已发出，返回会话核对；不会自动重投。')
    else releaseEditPreparation(attempt, '原图准备已暂停，可重试。')
  }, [visible])
  const selectItem = (url: string) => {
    if (url === selectedUrl) return
    selectionRevision.current += 1
    const attempt = editAttempt.current
    sourceRead.current?.abort()
    sourceRead.current = undefined
    releaseEditPreparation(attempt, '已切换图片，原图准备已取消，可重新提交。')
    setSelectedUrl(url)
  }
  const move = (direction: number) => {
    if (items.length < 2) return
    selectItem(items[(index + direction + items.length) % items.length]!.url)
    setGrid(false)
  }
  const resolveSource = async (signal?: AbortSignal) => {
    if (selected?.fileId) return selected.fileId
    if (!selected || !roomId || !sessionId) throw new Error('当前图片缺少会话来源')
    const response = await fetch(`${CHATROOM_API_PREFIX}/media/image-source`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, sessionId, imageId: selected.id }), ...(signal ? { signal } : {}) })
    if (!response.ok) throw new Error(`原图准备失败（${response.status}）`)
    return (await response.json() as { fileId: string }).fileId
  }
  const openVideoStudio = () => {
    if (!visible) return
    const attempt = editAttempt.current
    if (!attempt?.promptSent) releaseEditPreparation(attempt, '原图准备已取消，可重新提交。')
    const controller = new AbortController()
    const revision = selectionRevision.current
    sourceRead.current?.abort()
    sourceRead.current = controller
    void resolveSource(controller.signal).then(fileId => {
      if (!controller.signal.aborted && revision === selectionRevision.current) setVideoFileId(fileId)
    }).catch(cause => {
      if (!controller.signal.aborted && revision === selectionRevision.current) setError(String(cause.message))
    })
  }
  const submitEdit = async () => {
    if (!visible || !selected || !roomId || !sessionId || !selection || !prompt.trim() || submitted) return
    const revision = selectionRevision.current
    const controller = new AbortController()
    sourceRead.current?.abort()
    sourceRead.current = controller
    const attempt = { preparing: true, promptSent: false }
    editAttempt.current = attempt
    setSubmitted(true); setEditStatus('正在准备原图…')
    const threadId = sessionId.startsWith('chatroom-thread-v1-') ? sessionId.slice('chatroom-thread-v1-'.length) : undefined
    try {
      const sourceFileId = await resolveSource(controller.signal)
      if (controller.signal.aborted || revision !== selectionRevision.current) {
        releaseEditPreparation(attempt, '原图准备已暂停，可重试。')
        return
      }
      attempt.preparing = false
      attempt.promptSent = true
      sourceRead.current = undefined
      setEditStatus('正在提交改图请求…')
      const response = await fetch(`${CHATROOM_API_PREFIX}/${threadId ? 'threads/prompt' : 'prompt'}`, {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: crypto.randomUUID(), ...(threadId ? { threadId } : { roomId }), mode: 'queue',
          content: [{ type: 'text', text: `@AI 请实际调用一次 chatroom_edit_image 修改原图，不要重新文生图。sourceFileId=${sourceFileId}；selectionJson=${JSON.stringify(selection)}。仅修改选区，尽量保留其他区域。修改要求：${prompt.trim()}。完成后返回真实图片预览；失败不要自动重试。` }] }),
      })
      if (revision !== selectionRevision.current) return
      if (!response.ok) { setEditStatus(`改图请求已发出但回执异常（HTTP ${response.status}），请回会话核对；不会自动重复提交。`); return }
      setEditStatus('已提交，结果将在本会话回复。关闭预览不会取消生成。')
    } catch (cause) {
      if (!attempt.promptSent && !controller.signal.aborted && revision === selectionRevision.current) {
        attempt.preparing = false
        if (editAttempt.current === attempt) {
          setSubmitted(false)
          setEditStatus(`原图准备失败，可重试：${cause instanceof Error ? cause.message : '未知错误'}`)
        }
      } else if (attempt.promptSent && revision === selectionRevision.current) setEditStatus('改图请求回执未知，请回会话核对；不会自动重复提交。')
    }
  }
  return createPortal(<dialog ref={dialog} className="dsh-chatroom-image-viewer" aria-label="会话图片图库"
    onCancel={event => { event.preventDefault(); close() }}
    onClick={event => {
      const element = event.currentTarget
      if (event.target === element && isDialogBackdropClick(element, event.clientX, event.clientY)) close()
    }}
    onKeyDown={event => {
      if (!event.currentTarget.contains(event.target as Node)) return
      if (/INPUT|TEXTAREA|SELECT/u.test((event.target as HTMLElement).tagName)) return
      if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1) }
      if (event.key === 'ArrowRight') { event.preventDefault(); move(1) }
    }}>
    <header><strong>{grid ? '本会话全部图片' : `图片 ${index + 1} / ${items.length}`}</strong>
      <button type="button" onClick={() => setGrid(value => !value)} disabled={!selected}>{grid ? '返回大图' : '全部缩略图'}</button>
      {!grid && selected && roomId && sessionId && <button type="button" onClick={() => setEditing(value => !value)}>{editing ? '退出框选' : '框选改图'}</button>}
      {!grid && selected && roomId && sessionId && <button type="button" onClick={openVideoStudio}>图生视频</button>}
      {selected && <a href={selected.url} download>下载原图</a>}
      <button autoFocus type="button" aria-label="关闭大图" onClick={close}>× 关闭</button></header>
    {error && <p role="alert">{error} <button type="button" onClick={() => setRetry(value => value + 1)}>重试图库</button></p>}
    {loading && <p role="status">正在读取本会话图片目录…</p>}
    {!loading && !error && items.length === 0 && <p>本会话暂无图片</p>}
    {grid ? <div className="dsh-chatroom-gallery-grid">{visible && items.map((item, i) => <button type="button" key={item.url} onClick={() => { selectItem(item.url); setGrid(false) }} aria-label={`打开第 ${i + 1} 张图片`}>
      <img src={mediaThumbnailUrl(item.url)} alt={item.name.startsWith('generated-') ? '生成的图片' : item.name} loading="lazy" decoding="async" />
      <span>图片 {i + 1}</span></button>)}</div>
      : selected && <><div className="dsh-chatroom-gallery-stage"><GalleryOriginal key={selected.url} item={selected} editing={editing} selection={selection} onSelection={setSelection} /></div>
        {editing && <section className="dsh-chatroom-image-edit">
          <p>拖动框选需要修改的位置。由当前主 Agent（可用 GPT / M3）调用改图工具，选区外会尽量保留，但不保证逐像素不变。</p>
          <button type="button" onClick={() => setSelection({ x: 0, y: 0, width: 1, height: 1 })}>选择整张图片</button>
          <label>修改要求<textarea aria-label="图片修改要求" value={prompt} maxLength={4000} onChange={event => setPrompt(event.target.value)} placeholder="例如：把选中的帽子改成红色" /></label>
          <button type="button" disabled={!selection || selection.width < .001 || selection.height < .001 || !prompt.trim() || submitted} onClick={() => { void submitEdit() }}>提交改图（使用生图额度）</button>
          {editStatus && <p role="status">{editStatus}</p>}
        </section>}
        <nav className="dsh-chatroom-gallery-navigation" aria-label="图片导航"><button type="button" disabled={items.length < 2} onClick={() => move(-1)}>← 上一张</button>
          <span>{index + 1} / {items.length}</span><button type="button" disabled={items.length < 2} onClick={() => move(1)}>下一张 →</button></nav></>}
    {videoFileId && roomId && sessionId && <VideoStudio roomId={roomId} sessionId={sessionId} sourceFileId={videoFileId} close={() => setVideoFileId(undefined)} />}
  </dialog>, document.body)
}
