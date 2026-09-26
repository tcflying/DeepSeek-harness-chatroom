import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { miniMaxConnector } from '../src/minimax-code.js'
import { VideoJobs, validateVideo, type VideoInput } from '../src/video-jobs.js'
import { mediaByteRange } from '../src/media.js'
vi.mock('../src/minimax-code.js', () => ({ miniMaxConnector: vi.fn(), invokeMiniMaxCode: vi.fn() }))
let directory: string
beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), 'chatroom-video-')); vi.mocked(miniMaxConnector).mockReset() })
afterEach(async () => { vi.unstubAllGlobals(); await rm(directory, { recursive: true, force: true }) })
const input: VideoInput = { id: 'b07c6b92-149a-4182-b9ca-556e94b4d718', model: 'MiniMax-Hailuo-2.3', prompt: 'A cloud moves', duration: 6, resolution: '768P', confirmed: true }
it('validates explicit spend acknowledgement, model constraints and byte ranges', () => {
  expect(() => validateVideo({ ...input, confirmed: false })).toThrow()
  expect(() => validateVideo({ ...input, duration: 10, resolution: '1080P' })).toThrow()
  expect(() => validateVideo({ ...input, model: 'MiniMax-H3', duration: 15, resolution: '2K' })).not.toThrow()
  expect(mediaByteRange('bytes=5-99', 12)).toEqual({ start: 5, end: 11 })
  expect(mediaByteRange('bytes=-4', 12)).toEqual({ start: 8, end: 11 })
  for (const value of ['bytes=-0', 'bytes=12-', 'bytes=4-2', 'bytes=0-2,4-6', 'bytes=9007199254740992-']) expect(mediaByteRange(value, 12)).toBeUndefined()
})
it('persists admission and never repeats a paid submission after refresh or restart', async () => {
  vi.mocked(miniMaxConnector).mockResolvedValue({ task_id: 'task1', code: 0 })
  const jobs = new VideoJobs(directory, '/official-launcher')
  await jobs.submit('r', 's', 'admin', input)
  await vi.waitFor(async () => expect((await jobs.list('r', 's', 'admin'))[0]?.taskId).toBe('task1'))
  await jobs.submit('r', 's', 'admin', input)
  const restarted = new VideoJobs(directory, '/official-launcher')
  await restarted.submit('r', 's', 'admin', input)
  expect(miniMaxConnector).toHaveBeenCalledTimes(1)
  expect(await restarted.list('r', 's', 'other')).toEqual([])
  await expect(restarted.submit('r', 's', 'admin', { ...input, prompt: 'different' })).rejects.toThrow('同一提交编号')
  await jobs.stop(); await restarted.stop()
})
it('marks uncertain admissions without replay and checks source before any provider call', async () => {
  vi.mocked(miniMaxConnector).mockRejectedValue(new Error('timeout'))
  const jobs = new VideoJobs(directory, '/official-launcher')
  await expect(jobs.submit('r', 's', 'admin', { ...input, sourceFileId: 'missing' })).rejects.toThrow('原图')
  expect(miniMaxConnector).not.toHaveBeenCalled()
  await jobs.submit('r', 's', 'admin', input)
  await vi.waitFor(async () => expect((await jobs.list('r', 's', 'admin'))[0]?.status).toBe('unknown'))
  await jobs.submit('r', 's', 'admin', input)
  expect(miniMaxConnector).toHaveBeenCalledTimes(1)
  await jobs.stop()
})
it('imports without generating, saves a valid result once and rejects untrusted download URLs', async () => {
  const jobs = new VideoJobs(directory, '/official-launcher')
  const job = await jobs.importExisting('r', 's', 'admin', 'MiniMax-H3', '440584292126997')
  expect(miniMaxConnector).not.toHaveBeenCalled()
  expect((await jobs.importExisting('r', 's', 'admin', 'MiniMax-H3', job.taskId!)).id).toBe(job.id)
  vi.mocked(miniMaxConnector).mockResolvedValue({ status: 'succeeded', video_url: 'http://127.0.0.1/private' })
  const save = vi.fn(async () => 'saved'), request = vi.fn()
  vi.stubGlobal('fetch', request)
  await expect(jobs.refresh('r', 's', 'admin', job.id, save, new AbortController().signal)).rejects.toThrow('来源')
  expect(request).not.toHaveBeenCalled()
  vi.mocked(miniMaxConnector).mockResolvedValue({ status: 'succeeded', video_url: 'https://algeng-video-infer.oss-cn-shanghai.aliyuncs.com/result.mp4' })
  request.mockResolvedValue(new Response(Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 109, 112, 52, 50])))
  const completed = await jobs.refresh('r', 's', 'admin', job.id, save, new AbortController().signal)
  expect(completed.fileId).toBe('saved')
  await jobs.refresh('r', 's', 'admin', job.id, save, new AbortController().signal)
  expect(save).toHaveBeenCalledTimes(1)
  await expect(jobs.refresh('r', 's', 'other', job.id, save, new AbortController().signal)).rejects.toThrow('不存在')
  await jobs.stop()
})
it('aborts an active provider query when its owning view closes', async () => {
  const jobs = new VideoJobs(directory, '/official-launcher')
  const job = await jobs.importExisting('r', 's', 'admin', 'MiniMax-H3', 'task')
  const controller = new AbortController()
  vi.mocked(miniMaxConnector).mockImplementation((_launcher, _tool, _input, signal) => new Promise((_resolve, reject) => { signal!.addEventListener('abort', () => reject(new Error('aborted')), { once: true }) }))
  const refresh = jobs.refresh('r', 's', 'admin', job.id, vi.fn(), controller.signal)
  const rejection = expect(refresh).rejects.toThrow('aborted')
  await vi.waitFor(() => expect(miniMaxConnector).toHaveBeenCalledTimes(1))
  controller.abort(); await rejection; await jobs.stop()
})
