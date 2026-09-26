// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { LazyVideo, VideoStudio } from '../src/client/VideoStudio.js'
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
it('requires a model and explicit confirmation; aborts reads when closed or hidden', () => {
  const signals: AbortSignal[] = []
  vi.stubGlobal('fetch', vi.fn((_url, init: RequestInit) => { signals.push(init.signal!); return new Promise(() => {}) }))
  const view = render(<VideoStudio roomId="r" sessionId="s" close={() => {}} />)
  expect((screen.getByRole('button', { name: '生成视频' }) as HTMLButtonElement).disabled).toBe(true)
  expect((screen.getByLabelText('视频模型') as HTMLSelectElement).value).toBe('')
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  act(() => document.dispatchEvent(new Event('visibilitychange')))
  expect(signals.every(signal => signal.aborted)).toBe(true)
  view.unmount()
})
it('does not download before play and unloads media on close and unmount', () => {
  const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  const load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
  const view = render(<LazyVideo url="/authenticated-video" />)
  expect(view.container.querySelector('video')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '▶ 播放视频（点击才加载）' }))
  const element = view.container.querySelector('video')!
  expect(element.getAttribute('src')).toBe('/authenticated-video')
  fireEvent.click(screen.getByRole('button', { name: '关闭视频' }))
  expect(element.getAttribute('src')).toBeNull()
  expect(pause).toHaveBeenCalled(); expect(load).toHaveBeenCalled()
  expect(view.container.querySelector('video')).toBeNull()
})

it('unlocks an explicitly rejected submission without treating it as an unknown paid action', async () => {
  vi.stubGlobal('crypto', { randomUUID: () => 'fixture-video-id' })
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return Promise.resolve(new Response(JSON.stringify({ error: '额度确认已失效' }), { status: 400 }))
    return Promise.resolve(new Response(JSON.stringify({ jobs: [] })))
  }))
  render(<VideoStudio roomId="r" sessionId="s" close={() => {}} />)
  fireEvent.change(screen.getByLabelText('视频模型'), { target: { value: 'MiniMax-H3' } })
  fireEvent.change(screen.getByLabelText('视频描述'), { target: { value: 'fixture prompt' } })
  fireEvent.click(screen.getByRole('checkbox', { name: '我确认使用所选模型的订阅额度或积分' }))
  fireEvent.click(screen.getByRole('button', { name: '生成视频' }))
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('额度确认已失效'))
  expect((screen.getByRole('button', { name: '生成视频' }) as HTMLButtonElement).disabled).toBe(false)
  expect(screen.queryByText('回执未知，请勿重复提交')).toBeNull()
})

it('keeps the accepted request id visible and locks the form while it refreshes the same job', async () => {
  vi.stubGlobal('crypto', { randomUUID: () => 'fixture-video-id' })
  const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return Promise.resolve(new Response(JSON.stringify({ job: { id: 'fixture-video-id' } })))
    return Promise.resolve(new Response(JSON.stringify({ jobs: [] })))
  })
  vi.stubGlobal('fetch', fetchMock)
  render(<VideoStudio roomId="r" sessionId="s" close={() => {}} />)
  fireEvent.change(screen.getByLabelText('视频模型'), { target: { value: 'MiniMax-H3' } })
  fireEvent.change(screen.getByLabelText('视频描述'), { target: { value: 'fixture prompt' } })
  fireEvent.click(screen.getByRole('checkbox', { name: '我确认使用所选模型的订阅额度或积分' }))
  fireEvent.click(screen.getByRole('button', { name: '生成视频' }))
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('本次请求已接纳'))
  expect(screen.getByRole('status').textContent).toContain('fixture-video-id')
  expect((screen.getByRole('button', { name: '已接纳，正在查询任务' }) as HTMLButtonElement).disabled).toBe(true)
  const body = JSON.parse(String((fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')?.[1] as RequestInit).body)) as { id: string }
  expect(body.id).toBe('fixture-video-id')
})

it('treats a 502 response as unknown and does not unlock a retry', async () => {
  vi.stubGlobal('crypto', { randomUUID: () => 'fixture-video-id' })
  vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => init?.method === 'POST'
    ? Promise.resolve(new Response(JSON.stringify({ error: 'upstream timeout' }), { status: 502 }))
    : Promise.resolve(new Response(JSON.stringify({ jobs: [] })))))
  render(<VideoStudio roomId="r" sessionId="s" close={() => {}} />)
  fireEvent.change(screen.getByLabelText('视频模型'), { target: { value: 'MiniMax-H3' } })
  fireEvent.change(screen.getByLabelText('视频描述'), { target: { value: 'fixture prompt' } })
  fireEvent.click(screen.getByRole('checkbox', { name: '我确认使用所选模型的订阅额度或积分' }))
  fireEvent.click(screen.getByRole('button', { name: '生成视频' }))
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('HTTP 502'))
  expect(screen.getByRole('status').textContent).toContain('提交回执未知')
  expect((screen.getByRole('button', { name: '回执未知，请勿重复提交' }) as HTMLButtonElement).disabled).toBe(true)
})
