// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { CHATROOM_RECONNECTED, RecoverableImage } from '../src/client/RecoverableImage.js'
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('retries only the failed image GET on explicit click and reconnect, never successful images', () => {
  const url = '/plugins/deepseek-harness-chatroom/api/files/test-image'
  render(<RecoverableImage url={url} alt="验收图" />)
  fireEvent.error(screen.getByAltText('验收图'))
  fireEvent.click(screen.getByRole('button', { name: '图片预览加载失败 · 点击重试' }))
  expect(screen.getByAltText('验收图').getAttribute('src')).toBe(url + '?preview=thumbnail&previewRetry=1')
  act(() => window.dispatchEvent(new Event(CHATROOM_RECONNECTED)))
  expect(screen.getByAltText('验收图').getAttribute('src')).toBe(url + '?preview=thumbnail&previewRetry=1')
  fireEvent.error(screen.getByAltText('验收图'))
  act(() => window.dispatchEvent(new Event(CHATROOM_RECONNECTED)))
  expect(screen.getByAltText('验收图').getAttribute('src')).toBe(url + '?preview=thumbnail&previewRetry=2')
  expect(screen.queryByRole('button', { name: '图片预览加载失败 · 点击重试' })).toBeNull()
})

it('loads only the thumbnail until opened, closes accessibly, and preserves existing query parameters', () => {
  const request = vi.fn((_url: string, _init?: RequestInit) => new Promise<Response>(() => {}))
  vi.stubGlobal('fetch', request)
  const url = '/plugins/deepseek-harness-chatroom/api/files/test?key=1'
  render(<RecoverableImage url={url} alt="小图" />)
  expect(screen.getByAltText('小图').getAttribute('src')).toBe(url + '&preview=thumbnail')
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: '查看大图：小图' }))
  expect(request).toHaveBeenCalledTimes(1)
  expect(request.mock.calls[0]?.[0]).toBe(url)
  const signal = (request.mock.calls[0]?.[1] as RequestInit).signal!
  expect(signal.aborted).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: '关闭大图' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(signal.aborted).toBe(true)
})
