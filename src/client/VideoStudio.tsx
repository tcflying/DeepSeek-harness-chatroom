import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CHATROOM_API_PREFIX } from '../routes.js'
import type { VideoJob } from '../video-jobs.js'
import { isDialogBackdropClick, usePageVisible } from './media-lifecycle.js'

interface VideoScope { roomId: string; sessionId: string; sourceFileId?: string }
type SubmissionReceipt = { id: string; status: 'submitting' | 'accepted' | 'unknown' }
const labels: Record<VideoJob['status'], string> = { submitting: '正在提交', queued: '排队中', running: '生成中', succeeded: '已完成', failed: '失败', cancelled: '已取消', unknown: '回执未知，请核对，勿重复提交' }
export function VideoStudioButton(props: VideoScope): JSX.Element {
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [props.roomId, props.sessionId])
  return <><button type="button" className="dsh-chatroom-manage-action" onClick={() => setOpen(true)}>▶ 视频创作</button>
    {open && <VideoStudio {...props} close={() => setOpen(false)} />}</>
}

/** Closing only aborts reads. An admitted provider job keeps its durable id. */
export function VideoStudio({ roomId, sessionId, sourceFileId, close }: VideoScope & { close(): void }): JSX.Element {
  const dialog = useRef<HTMLDialogElement>(null)
  const visible = usePageVisible()
  const [model, setModel] = useState(''), [prompt, setPrompt] = useState('')
  const [duration, setDuration] = useState(6), [resolution, setResolution] = useState('768P')
  const [confirmed, setConfirmed] = useState(false), [submission, setSubmission] = useState<SubmissionReceipt>()
  const submissionId = useRef<string>()
  const [existingTask, setExistingTask] = useState(''), [importing, setImporting] = useState(false)
  const [jobs, setJobs] = useState<VideoJob[]>([]), [error, setError] = useState(''), [revision, setRevision] = useState(0)
  const query = `${CHATROOM_API_PREFIX}/media/videos?roomId=${encodeURIComponent(roomId)}&sessionId=${encodeURIComponent(sessionId)}`
  useEffect(() => {
    const element = dialog.current!, previous = document.activeElement as HTMLElement | null
    if (element.showModal) element.showModal(); else element.setAttribute('open', '')
    return () => { element.close?.(); if (previous?.isConnected) previous.focus() }
  }, [])
  useEffect(() => {
    if (!visible) return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const read = async () => {
      try {
        const response = await fetch(query, { credentials: 'same-origin', signal: controller.signal })
        const result = await response.json() as { jobs?: VideoJob[]; error?: string }
        if (!response.ok) throw new Error(result.error ?? `视频目录读取失败（${response.status}）`)
        const current = result.jobs ?? []
        for (let index = 0; index < current.length; index++) {
          const job = current[index]!
          if (!job.taskId || job.fileId || ['failed', 'cancelled'].includes(job.status)) continue
          const refresh = await fetch(`${query}&id=${encodeURIComponent(job.id)}`, { credentials: 'same-origin', signal: controller.signal })
          if (!refresh.ok) throw new Error(`视频任务读取失败（${refresh.status}），稍后可重查同一任务`)
          current[index] = (await refresh.json() as { job: VideoJob }).job
        }
        if (controller.signal.aborted) return
        setJobs(current); setError('')
        if (current.some(job => ['submitting', 'queued', 'running'].includes(job.status))) timer = setTimeout(() => { void read() }, 5000)
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '视频读取失败') }
    }
    void read()
    return () => { controller.abort(); if (timer) clearTimeout(timer) }
  }, [query, visible, revision])
  const submit = async () => {
    if (!visible || submissionId.current || !confirmed || !model || !prompt.trim()) return
    const id = crypto.randomUUID()
    submissionId.current = id
    setSubmission({ id, status: 'submitting' }); setError('')
    try {
      const response = await fetch(`${CHATROOM_API_PREFIX}/media/videos`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, roomId, sessionId, model, prompt: prompt.trim(), duration, resolution, sourceFileId, confirmed }) })
      let result: { job?: VideoJob; error?: string } | undefined
      try { result = await response.json() as { job?: VideoJob; error?: string } } catch { /* Missing a structured receipt is not a safe retry condition. */ }
      if (response.ok && result?.job?.id === id) {
        setSubmission({ id, status: 'accepted' })
        setRevision(value => value + 1)
        return
      }
      const safelyRejected = response.status >= 400 && response.status < 500 && ![408, 409, 429].includes(response.status) && !!result?.error && !result.job
      if (safelyRejected) {
        submissionId.current = undefined
        setSubmission(undefined)
        setError(result!.error!)
        return
      }
      setSubmission({ id, status: 'unknown' })
      setError(response.ok ? '提交未返回可核对的任务回执，请查询同一提交编号，勿重复提交。' : `提交回执未知（HTTP ${response.status}），请查询同一提交编号，勿重复提交。`)
    } catch {
      setSubmission({ id, status: 'unknown' })
      setError('提交回执未知。请查看下方已有任务或 MiniMax Code，勿重复提交。')
    }
  }
  const locked = !!submission
  const importTask = async () => {
    if (importing || !model || !existingTask.trim()) return
    setImporting(true)
    try {
      const response = await fetch(`${CHATROOM_API_PREFIX}/media/videos`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import', roomId, sessionId, model, taskId: existingTask.trim() }) })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error ?? '已有任务读取失败')
      setExistingTask(''); setRevision(value => value + 1)
    } catch (cause) { setError(cause instanceof Error ? cause.message : '读取失败') }
    finally { setImporting(false) }
  }
  return createPortal(<dialog ref={dialog} className="dsh-chatroom-image-viewer dsh-chatroom-video-studio" aria-label="MiniMax 视频创作"
    onCancel={event => { event.preventDefault(); close() }} onClick={event => {
      const element = event.currentTarget
      if (event.target === element && isDialogBackdropClick(element, event.clientX, event.clientY)) close()
    }}>
    <header><strong>{sourceFileId ? '图生视频' : '文字生成视频'}</strong><button autoFocus type="button" onClick={close}>关闭视频创作</button></header>
    <p>使用本机已登录的 MiniMax Code CN。关闭窗口暂停查询，不会取消已提交的视频；再次打开继续查看同一任务。</p>
    <label>视频模型<select aria-label="视频模型" value={model} disabled={locked} onChange={event => { setModel(event.target.value); setDuration(6); setResolution('768P'); setConfirmed(false) }}>
      <option value="">请选择模型与额度渠道</option><option value="MiniMax-Hailuo-2.3">Hailuo 2.3 · 订阅资格由官方核验 · 无声</option>
      <option value="MiniMax-H3">H3 · 使用积分 · 原生声音</option><option value="MiniMax-H3-Max">H3 Max · 使用积分 · 原生声音</option></select></label>
    <label>视频描述<textarea aria-label="视频描述" maxLength={7000} value={prompt} disabled={locked} onChange={event => setPrompt(event.target.value)} /></label>
    <div className="dsh-chatroom-video-options"><label>时长（秒）<input aria-label="视频时长" type="number" min={model === 'MiniMax-H3' ? 4 : model === 'MiniMax-H3-Max' ? 5 : 6} max={model === 'MiniMax-Hailuo-2.3' ? 10 : 15} step={model === 'MiniMax-Hailuo-2.3' ? 4 : 1} value={duration} disabled={locked} onChange={event => setDuration(Number(event.target.value))} /></label>
      <label>分辨率<select aria-label="视频分辨率" value={resolution} disabled={locked} onChange={event => setResolution(event.target.value)}>
        {model === 'MiniMax-H3-Max' && <option>480P</option>}<option>768P</option>{model === 'MiniMax-H3' && <option>2K</option>}{model === 'MiniMax-Hailuo-2.3' && <option>1080P</option>}</select></label></div>
    {model === 'MiniMax-Hailuo-2.3' && <small>支持 6 / 10 秒；1080P 仅支持 6 秒。订阅不保证所有模型免费。</small>}
    {sourceFileId && <p>提交时会把所选原图上传给 MiniMax 作为首帧。</p>}
    <label><input type="checkbox" checked={confirmed} disabled={locked} onChange={event => setConfirmed(event.target.checked)} /> 我确认使用所选模型的订阅额度或积分</label>
    <button type="button" disabled={locked || !model || !confirmed || !prompt.trim()} onClick={() => { void submit() }}>{submission?.status === 'accepted' ? '已接纳，正在查询任务' : submission?.status === 'unknown' ? '回执未知，请勿重复提交' : submission?.status === 'submitting' ? '正在提交，请等待回执' : '生成视频'}</button>
    {submission && <p role="status">{submission.status === 'accepted' ? '本次请求已接纳，正在刷新已有任务。' : submission.status === 'unknown' ? '提交回执未知，请勿重复提交。' : '正在等待提交回执。'} 提交编号：{submission.id}</p>}
    {error && <p role="alert">{error}</p>}
    <h3>本会话的视频任务</h3><button type="button" onClick={() => setRevision(value => value + 1)}>刷新已有任务（不重新生成）</button>
    <details><summary>读取 MiniMax Code 中的已有视频</summary><p>先在上方选择原任务的同一模型，再填写官方 task_id。只查询和保存结果，不生成新视频。</p>
      <input aria-label="已有视频任务编号" value={existingTask} onChange={event => setExistingTask(event.target.value)} maxLength={100} />
      <button type="button" disabled={importing || !model || !existingTask.trim()} onClick={() => { void importTask() }}>读取已有视频</button></details>
    {jobs.length === 0 && <p>暂无本插件提交的视频任务。MiniMax Code 中的既有任务不会自动重投。</p>}
    {jobs.map(job => <article key={job.id}><strong>{job.model} · {labels[job.status]}</strong><small>任务：{job.taskId ?? job.id}</small>
      {job.error && <p>{job.error}</p>}{job.fileId && <LazyVideo url={`${CHATROOM_API_PREFIX}/files/${job.fileId}`} />}</article>)}
  </dialog>, document.body)
}

export function LazyVideo({ url }: { url: string }): JSX.Element {
  const visible = usePageVisible(), video = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    if (!visible) setPlaying(false)
    const element = video.current
    return () => { if (element) { element.pause(); element.removeAttribute('src'); element.load() } }
  }, [url, visible, playing])
  return <div className="dsh-chatroom-video-preview">{playing && visible ? <><video ref={video} src={url} controls autoPlay playsInline preload="none" /><button type="button" onClick={() => setPlaying(false)}>关闭视频</button></>
    : <button type="button" onClick={() => setPlaying(true)}>▶ 播放视频（点击才加载）</button>}</div>
}
