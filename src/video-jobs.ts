import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { invokeMiniMaxCode, miniMaxConnector } from './minimax-code.js'
import type { DiagnosticJournal } from './diagnostics.js'
import { diagnosticError } from './diagnostics.js'

export const VIDEO_MODELS = ['MiniMax-Hailuo-2.3', 'MiniMax-H3', 'MiniMax-H3-Max'] as const
export interface VideoInput { id: string; model: string; prompt: string; duration: number; resolution: string; sourceFileId?: string; confirmed: boolean }
export interface VideoJob {
  id: string; roomId: string; sessionId: string; owner: string; fingerprint: string; model: string; createdAt: number
  status: 'submitting' | 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'unknown'
  taskId?: string; fileId?: string; error?: string
}
export function validateVideo(input: VideoInput): void {
  if (!/^[a-f0-9-]{36}$/iu.test(input.id) || !VIDEO_MODELS.includes(input.model as typeof VIDEO_MODELS[number]) || input.confirmed !== true
    || typeof input.prompt !== 'string' || !input.prompt.trim() || input.prompt.length > 7000 || !Number.isInteger(input.duration)) throw new Error('请明确选择视频模型、描述并确认额度使用。')
  const allowed = input.model === 'MiniMax-Hailuo-2.3'
    ? [6, 10].includes(input.duration) && ['768P', '1080P'].includes(input.resolution) && (input.resolution !== '1080P' || input.duration === 6)
    : input.model === 'MiniMax-H3' ? input.duration >= 4 && input.duration <= 15 && ['768P', '2K'].includes(input.resolution)
      : input.duration >= 5 && input.duration <= 15 && ['480P', '768P'].includes(input.resolution)
  if (!allowed) throw new Error('视频时长或分辨率不受此模型支持。')
}

/** Persist admission before the paid call. UI refresh and restart never resubmit. */
export class VideoJobs {
  private readonly active = new Map<string, Promise<void>>()
  private readonly queries = new Map<string, Promise<VideoJob>>()
  private readonly shutdown = new AbortController()
  private admitting = 0
  constructor(private readonly directory: string, private readonly launcher: string, private readonly journal?: DiagnosticJournal) {}
  private folder(roomId: string, sessionId: string) { return join(this.directory, createHash('sha256').update(`${roomId}\0${sessionId}`).digest('hex')) }
  private path(roomId: string, sessionId: string, id: string) {
    if (!/^[a-f0-9-]{36}$/iu.test(id)) throw new Error('视频任务编号无效。')
    return join(this.folder(roomId, sessionId), `${id}.json`)
  }
  private async save(job: VideoJob) {
    const path = this.path(job.roomId, job.sessionId, job.id), temporary = `${path}.${randomUUID()}.tmp`
    try { await writeFile(temporary, JSON.stringify(job), { flag: 'wx', mode: 0o600 }); await rename(temporary, path) }
    finally { await unlink(temporary).catch(() => undefined) }
  }
  async list(roomId: string, sessionId: string, owner: string): Promise<VideoJob[]> {
    const directory = this.folder(roomId, sessionId)
    const names = await readdir(directory).catch((e: NodeJS.ErrnoException) => { if (e.code === 'ENOENT') return []; throw e })
    const jobs: VideoJob[] = []
    for (const name of names.filter(name => /^[a-f0-9-]{36}\.json$/iu.test(name))) {
      const job = JSON.parse(await readFile(join(directory, name), 'utf8')) as VideoJob
      if (job.owner !== owner) continue
      jobs.push(job.status === 'submitting' && !this.active.has(job.id) ? { ...job, status: 'unknown', error: '提交曾中断，禁止自动重投；请按已有记录核对。' } : job)
    }
    return jobs.sort((a, b) => b.createdAt - a.createdAt).slice(0, 100)
  }
  async submit(roomId: string, sessionId: string, owner: string, input: VideoInput, source?: { data: Uint8Array; mediaType: string }): Promise<VideoJob> {
    validateVideo(input)
    this.shutdown.signal.throwIfAborted()
    const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex')
    const existing = (await this.list(roomId, sessionId, owner)).find(job => job.id === input.id)
    if (existing) { if (existing.fingerprint !== fingerprint) throw new Error('同一提交编号不能用于不同视频请求。'); return existing }
    if (this.active.size + this.admitting >= 2) throw new Error('已有视频正在提交，请稍后再试。')
    if (input.sourceFileId && !source) throw new Error('图生视频缺少已授权原图。')
    const job: VideoJob = { id: input.id, roomId, sessionId, owner, fingerprint, model: input.model, createdAt: Date.now(), status: 'submitting' }
    this.admitting++
    try {
      await mkdir(this.folder(roomId, sessionId), { recursive: true, mode: 0o700 })
      await writeFile(this.path(roomId, sessionId, job.id), JSON.stringify(job), { flag: 'wx', mode: 0o600 })
    } finally { this.admitting-- }
    this.journal?.record({ event: 'video.submit', operationId: job.id, sessionId })
    const work = (async () => {
      let temporary: string | undefined
      try {
        let image: { url: string; mime_type: string } | undefined
        if (source) {
          const { default: sharp } = await import('sharp')
          const png = await sharp(source.data, { limitInputPixels: 16_777_216 }).rotate().png().toBuffer()
          if (png.length > 30 * 1024 * 1024) throw new Error('视频参考图片过大。')
          temporary = join(this.folder(roomId, sessionId), `${job.id}.input.png`)
          await writeFile(temporary, png, { flag: 'wx', mode: 0o600 })
          const uploaded = await invokeMiniMaxCode(this.launcher, ['upload-temp-url', temporary], undefined, this.shutdown.signal) as { temp_url?: string }
          if (!uploaded.temp_url || new URL(uploaded.temp_url).protocol !== 'https:') throw new Error('参考图上传没有返回 HTTPS 地址。')
          image = { url: uploaded.temp_url, mime_type: 'image/png' }
        }
        const result = await miniMaxConnector(this.launcher, 'submit_video_generation', {
          model: input.model, prompt: input.prompt, duration: input.duration, resolution: input.resolution,
          ...(image ? { input_image: image, reference_type: 'first_frame' } : {}),
        }, this.shutdown.signal) as { task_id?: string; code?: number }
        if (!result.task_id || !/^[a-zA-Z0-9_-]{1,100}$/u.test(result.task_id)) throw new Error('提交未返回可靠任务编号。')
        job.taskId = result.task_id; job.status = 'queued'
      } catch (error) {
        job.status = 'unknown'; job.error = '提交未获得可靠回执。请核对 MiniMax Code，禁止自动重复提交。'
        this.journal?.record({ event: 'video.failure', operationId: job.id, sessionId, error: diagnosticError(error) })
      }
      finally {
        if (temporary) await unlink(temporary).catch(() => undefined)
        await this.save(job)
      }
    })().finally(() => this.active.delete(job.id))
    this.active.set(job.id, work)
    void work.catch(() => undefined)
    return { ...job }
  }
  async importExisting(roomId: string, sessionId: string, owner: string, model: string, taskId: string): Promise<VideoJob> {
    if (!VIDEO_MODELS.includes(model as typeof VIDEO_MODELS[number]) || !/^[a-zA-Z0-9_-]{1,100}$/u.test(taskId)) throw new Error('已有任务编号或模型无效。')
    const existing = (await this.list(roomId, sessionId, owner)).find(job => job.taskId === taskId && job.model === model)
    if (existing) return existing
    const job: VideoJob = { id: randomUUID(), roomId, sessionId, owner, fingerprint: 'imported-existing-task', model, taskId, createdAt: Date.now(), status: 'queued' }
    await mkdir(this.folder(roomId, sessionId), { recursive: true, mode: 0o700 })
    await this.save(job)
    return job
  }
  async refresh(roomId: string, sessionId: string, owner: string, id: string, saveVideo: (job: VideoJob, data: Uint8Array) => Promise<string>, signal: AbortSignal): Promise<VideoJob> {
    signal = AbortSignal.any([signal, this.shutdown.signal])
    signal.throwIfAborted()
    const key = `${roomId}:${sessionId}:${owner}:${id}`
    const existing = this.queries.get(key)
    if (existing) return existing
    const work = (async () => {
      const job = (await this.list(roomId, sessionId, owner)).find(job => job.id === id)
      if (!job) throw new Error('视频任务不存在。')
      if (!job.taskId || job.fileId || ['failed', 'cancelled'].includes(job.status)) return job
      const result = await miniMaxConnector(this.launcher, 'query_video_generation', { task_id: job.taskId, model: job.model }, signal) as { status?: string; video_url?: string }
      if (result.status === 'succeeded' && result.video_url) {
        const url = new URL(result.video_url)
        if (url.protocol !== 'https:' || !url.hostname.endsWith('.oss-cn-shanghai.aliyuncs.com') || url.username || url.password) throw new Error('视频下载来源未经验证。')
        const response = await fetch(url, { signal, redirect: 'error' })
        if (!response.ok || !response.body) throw new Error('视频下载暂时失败，请重新读取同一任务。')
        const chunks: Uint8Array[] = []; let bytes = 0
        const reader = response.body.getReader()
        try { for (;;) { const part = await reader.read(); if (part.done) break; bytes += part.value.length; if (bytes > 100 * 1024 * 1024) throw new Error('视频超过本机保存上限。'); chunks.push(part.value) } }
        finally { await reader.cancel().catch(() => undefined) }
        const data = Buffer.concat(chunks)
        if (data.subarray(4, 8).toString() !== 'ftyp') throw new Error('视频不是有效 MP4 容器。')
        signal.throwIfAborted()
        job.fileId = await saveVideo(job, data); job.status = 'succeeded'
        this.journal?.record({ event: 'video.success', operationId: job.id, sessionId, bytes: data.length, outcome: 'success' })
      } else if (['queued', 'running', 'failed', 'cancelled'].includes(result.status ?? '')) job.status = result.status as VideoJob['status']
      await this.save(job)
      return job
    })().catch(error => { this.journal?.record({ event: 'video.failure', operationId: id, sessionId, error: diagnosticError(error) }); throw error }).finally(() => this.queries.delete(key))
    this.queries.set(key, work)
    return work
  }
  async stop() { this.shutdown.abort(); await Promise.allSettled([...this.active.values(), ...this.queries.values()]) }
}
