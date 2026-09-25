// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { MediaGallery } from '../src/client/MediaGallery.js'

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
const item = (id: string) => ({ id, url: `/plugins/deepseek-harness-chatroom/api/files/${id}`, name: id, mediaType: 'image/png', createdAt: 1 })
it('loads full paginated session metadata, navigates originals, and releases GETs on grid/close', async () => {
  const calls: { url: string; signal: AbortSignal }[] = []
  vi.stubGlobal('fetch', vi.fn((url: string, options: RequestInit) => {
    calls.push({ url, signal: options.signal! })
    if (url.includes('/media/gallery')) return Promise.resolve(new Response(JSON.stringify(url.includes('offset=0')
      ? { items: [item('one')], next: 100 } : { items: [item('two')] })))
    return new Promise<Response>(() => {})
  }))
  const view = render(<MediaGallery roomId="r1" sessionId="s1" initial={item('one')} close={() => {}} />)
  await waitFor(() => expect((screen.getByRole('button', { name: '下一张 →' }) as HTMLButtonElement).disabled).toBe(false))
  expect(calls.filter(call => call.url.includes('/media/gallery'))).toHaveLength(2)
  const first = calls.find(call => call.url === item('one').url)!
  fireEvent.click(screen.getByRole('button', { name: '下一张 →' }))
  expect(first.signal.aborted).toBe(true)
  expect(calls.filter(call => call.url === item('two').url)).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: '全部缩略图' }))
  expect(calls.find(call => call.url === item('two').url)!.signal.aborted).toBe(true)
  expect(screen.getAllByRole('img').every(img => img.getAttribute('src')?.endsWith('?preview=thumbnail'))).toBe(true)
  view.unmount()
  expect(calls.every(call => call.signal.aborted)).toBe(true)
})
it('aborts a hanging original and gallery read when the tab becomes hidden', async () => {
  const signals: AbortSignal[] = []
  vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) => {
    signals.push(options.signal!); return new Promise<Response>(() => {})
  }))
  render(<MediaGallery roomId="r1" sessionId="s1" initial={item('one')} close={() => {}} />)
  expect(signals.length).toBe(2)
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  act(() => document.dispatchEvent(new Event('visibilitychange')))
  expect(signals.every(signal => signal.aborted)).toBe(true)
  expect(screen.queryByRole('img')).toBeNull()
})

it('shows a failed gallery read without also claiming that the session is empty', async () => {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.includes('/media/gallery')) return Promise.resolve(new Response('upstream unavailable', { status: 502 }))
    return new Promise<Response>(() => {})
  }))
  render(<MediaGallery roomId="r1" sessionId="s1" close={() => {}} />)
  expect((await screen.findByRole('alert')).textContent).toContain('图库读取失败（HTTP 502）')
  expect(screen.getByRole('button', { name: '重试图库' })).toBeTruthy()
  expect(screen.queryByText('本会话暂无图片')).toBeNull()
})

it('aborts a pending image-source read on hide before it can submit an edit', async () => {
  let sourceSignal: AbortSignal | undefined
  const fetchMock = vi.fn((url: string, options: RequestInit) => {
    if (url.includes('/media/gallery')) return Promise.resolve(new Response(JSON.stringify({ items: [item('one')] })))
    if (url.includes('/media/image-source')) { sourceSignal = options.signal!; return new Promise<Response>(() => {}) }
    return new Promise<Response>(() => {})
  })
  vi.stubGlobal('fetch', fetchMock)
  render(<MediaGallery roomId="r1" sessionId="s1" initial={item('one')} close={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: '框选改图' }))
  fireEvent.click(screen.getByRole('button', { name: '选择整张图片' }))
  fireEvent.change(screen.getByLabelText('图片修改要求'), { target: { value: 'fixture edit' } })
  fireEvent.click(screen.getByRole('button', { name: '提交改图（使用生图额度）' }))
  await waitFor(() => expect(sourceSignal).toBeDefined())
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  act(() => document.dispatchEvent(new Event('visibilitychange')))
  expect(sourceSignal!.aborted).toBe(true)
  expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/prompt'))).toBe(false)
})

it('unlocks a hidden source preparation after returning, without sending the paid prompt until the user retries', async () => {
  let sourceSignal: AbortSignal | undefined
  let sourceReads = 0
  const fetchMock = vi.fn((url: string, options: RequestInit) => {
    if (url.includes('/media/gallery')) return Promise.resolve(new Response(JSON.stringify({ items: [item('one')] })))
    if (url.includes('/media/image-source')) {
      sourceReads++
      if (sourceReads === 1) { sourceSignal = options.signal!; return new Promise<Response>(() => {}) }
      return Promise.resolve(new Response(JSON.stringify({ fileId: 'source-one' })))
    }
    if (String(url).endsWith('/prompt')) return Promise.resolve(new Response(JSON.stringify({ ok: true })))
    return new Promise<Response>(() => {})
  })
  vi.stubGlobal('fetch', fetchMock)
  render(<MediaGallery roomId="r1" sessionId="s1" initial={item('one')} close={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: '框选改图' }))
  fireEvent.click(screen.getByRole('button', { name: '选择整张图片' }))
  fireEvent.change(screen.getByLabelText('图片修改要求'), { target: { value: 'fixture edit' } })
  fireEvent.click(screen.getByRole('button', { name: '提交改图（使用生图额度）' }))
  await waitFor(() => expect(sourceSignal).toBeDefined())
  const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  act(() => document.dispatchEvent(new Event('visibilitychange')))
  expect(sourceSignal!.aborted).toBe(true)
  expect(screen.getByText('原图准备已暂停，可重试。')).toBeTruthy()
  visibility.mockReturnValue('visible')
  act(() => document.dispatchEvent(new Event('visibilitychange')))
  expect((screen.getByRole('button', { name: '提交改图（使用生图额度）' }) as HTMLButtonElement).disabled).toBe(false)
  expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/prompt'))).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: '提交改图（使用生图额度）' }))
  await waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/prompt'))).toHaveLength(1))
})

it('unlocks an explicit source preparation failure without treating it as a submitted edit', async () => {
  const fetchMock = vi.fn((url: string) => {
    if (url.includes('/media/gallery')) return Promise.resolve(new Response(JSON.stringify({ items: [item('one')] })))
    if (url.includes('/media/image-source')) return Promise.resolve(new Response('missing', { status: 404 }))
    return new Promise<Response>(() => {})
  })
  vi.stubGlobal('fetch', fetchMock)
  render(<MediaGallery roomId="r1" sessionId="s1" initial={item('one')} close={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: '框选改图' }))
  fireEvent.click(screen.getByRole('button', { name: '选择整张图片' }))
  fireEvent.change(screen.getByLabelText('图片修改要求'), { target: { value: 'fixture edit' } })
  fireEvent.click(screen.getByRole('button', { name: '提交改图（使用生图额度）' }))
  await waitFor(() => expect(screen.getByText(/原图准备失败，可重试/u)).toBeTruthy())
  expect((screen.getByRole('button', { name: '提交改图（使用生图额度）' }) as HTMLButtonElement).disabled).toBe(false)
  expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/prompt'))).toBe(false)
})

it('aborts a later video source read on hide even after an edit prompt was already sent', async () => {
  let sourceReads = 0
  let videoSignal: AbortSignal | undefined
  let promptStarted: (() => void) | undefined
  const fetchMock = vi.fn((url: string, options: RequestInit) => {
    if (url.includes('/media/gallery')) return Promise.resolve(new Response(JSON.stringify({ items: [item('one')] })))
    if (url.includes('/media/image-source')) {
      sourceReads++
      if (sourceReads === 1) return Promise.resolve(new Response(JSON.stringify({ fileId: 'edit-source' })))
      videoSignal = options.signal!
      return new Promise<Response>(() => {})
    }
    if (String(url).endsWith('/prompt')) return new Promise<Response>(resolve => { promptStarted = () => resolve(new Response(JSON.stringify({ ok: true }))) })
    return new Promise<Response>(() => {})
  })
  vi.stubGlobal('fetch', fetchMock)
  render(<MediaGallery roomId="r1" sessionId="s1" initial={item('one')} close={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: '框选改图' }))
  fireEvent.click(screen.getByRole('button', { name: '选择整张图片' }))
  fireEvent.change(screen.getByLabelText('图片修改要求'), { target: { value: 'fixture edit' } })
  fireEvent.click(screen.getByRole('button', { name: '提交改图（使用生图额度）' }))
  await waitFor(() => expect(promptStarted).toBeDefined())
  fireEvent.click(screen.getByRole('button', { name: '图生视频' }))
  await waitFor(() => expect(videoSignal).toBeDefined())
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  act(() => document.dispatchEvent(new Event('visibilitychange')))
  expect(videoSignal!.aborted).toBe(true)
  expect(screen.getByText('改图请求已发出，返回会话核对；不会自动重投。')).toBeTruthy()
  promptStarted!()
})

it('keeps dialog content padding open but closes a real backdrop click', () => {
  const close = vi.fn()
  render(<MediaGallery initial={item('one')} close={close} />)
  const dialog = screen.getByRole('dialog')
  vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({ left: 100, right: 500, top: 100, bottom: 400, width: 400, height: 300, x: 100, y: 100, toJSON: () => ({}) })
  fireEvent.click(dialog, { clientX: 300, clientY: 200 })
  expect(close).not.toHaveBeenCalled()
  fireEvent.click(dialog, { clientX: 50, clientY: 200 })
  expect(close).toHaveBeenCalledTimes(1)
})

it('navigates with arrows in the gallery but ignores arrows from its nested video dialog', async () => {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.includes('/media/gallery')) return Promise.resolve(new Response(JSON.stringify({ items: [item('one'), item('two')] })))
    if (url.includes('/media/image-source')) return Promise.resolve(new Response(JSON.stringify({ fileId: 'source-one' })))
    if (url.includes('/media/videos')) return Promise.resolve(new Response(JSON.stringify({ jobs: [] })))
    return new Promise<Response>(() => {})
  }))
  render(<MediaGallery roomId="r1" sessionId="s1" initial={item('one')} close={() => {}} />)
  await waitFor(() => expect(screen.getByText('图片 1 / 2')).toBeTruthy())
  const gallery = screen.getByRole('dialog', { name: '会话图片图库' })
  fireEvent.keyDown(gallery, { key: 'ArrowRight' })
  expect(screen.getByText('图片 2 / 2')).toBeTruthy()
  fireEvent.keyDown(gallery, { key: 'ArrowLeft' })
  fireEvent.click(screen.getByRole('button', { name: '图生视频' }))
  const studio = await screen.findByRole('dialog', { name: 'MiniMax 视频创作' })
  fireEvent.keyDown(studio, { key: 'ArrowRight' })
  expect(screen.getByText('图片 1 / 2')).toBeTruthy()
})

it('does not open a video dialog when a late image-source read belongs to the previous selection', async () => {
  let resolveSource: ((response: Response) => void) | undefined
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.includes('/media/gallery')) return Promise.resolve(new Response(JSON.stringify({ items: [item('one'), item('two')] })))
    if (url.includes('/media/image-source')) return new Promise<Response>(resolve => { resolveSource = resolve })
    return new Promise<Response>(() => {})
  }))
  render(<MediaGallery roomId="r1" sessionId="s1" initial={item('one')} close={() => {}} />)
  await waitFor(() => expect(screen.getByText('图片 1 / 2')).toBeTruthy())
  fireEvent.click(screen.getByRole('button', { name: '图生视频' }))
  fireEvent.click(screen.getByRole('button', { name: '下一张 →' }))
  resolveSource!(new Response(JSON.stringify({ fileId: 'source-one' })))
  await act(async () => {})
  expect(screen.queryByRole('dialog', { name: 'MiniMax 视频创作' })).toBeNull()
})
