// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CHATROOM_STYLE_KEY, ChatroomSidebarBackdrop, ChatroomStyleSwitch, createChatroomStyleStore } from '../src/client/ChatroomStyleSwitch.js'

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); document.documentElement.removeAttribute('data-dsh-chatroom-style') })

it('switches the full root style, persists it, and restores the untouched native preference', () => {
  document.documentElement.style.colorScheme = 'dark'
  const styles = createChatroomStyleStore()
  const dispose = styles.install()
  render(<ChatroomStyleSwitch styles={styles} />)
  expect(styles.getSnapshot().style).toBe('qq2007')
  fireEvent.change(screen.getByRole('combobox', { name: '界面风格' }), { target: { value: 'qq2007' } })
  expect(document.documentElement.dataset.dshChatroomStyle).toBe('qq2007')
  expect(localStorage.getItem(CHATROOM_STYLE_KEY)).toBe('qq2007')
  dispose()
  const restored = createChatroomStyleStore()
  const stop = restored.install()
  expect(restored.getSnapshot().style).toBe('qq2007')
  restored.set('default')
  expect(document.documentElement.hasAttribute('data-dsh-chatroom-style')).toBe(false)
  expect(document.documentElement.style.colorScheme).toBe('dark')
  stop()
  const explicitNative = createChatroomStyleStore()
  const stopNative = explicitNative.install()
  expect(explicitNative.getSnapshot().style).toBe('default')
  stopNative()
})

it('keeps working when storage is denied and describes the persistence boundary', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw Error('blocked') })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('blocked') })
  const styles = createChatroomStyleStore()
  const stop = styles.install()
  render(<ChatroomStyleSwitch styles={styles} />)
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'qq2007' } })
  expect(document.documentElement.dataset.dshChatroomStyle).toBe('qq2007')
  expect(screen.getByRole('status').textContent).toBe('本次有效')
  stop()
})

it('closes the narrow-screen sidebar through the supplied native action', () => {
  const close = vi.fn()
  render(<ChatroomSidebarBackdrop close={close} />)
  fireEvent.click(screen.getByRole('button', {name: '关闭会话列表'}))
  expect(close).toHaveBeenCalledOnce()
})

it('synchronizes other same-origin tabs and ignores invalid stored values', () => {
  const styles = createChatroomStyleStore()
  const stop = styles.install()
  render(<ChatroomStyleSwitch styles={styles} />)
  act(() => { localStorage.setItem(CHATROOM_STYLE_KEY, 'qq2007'); window.dispatchEvent(new StorageEvent('storage', { key: CHATROOM_STYLE_KEY })) })
  expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('qq2007')
  act(() => { localStorage.setItem(CHATROOM_STYLE_KEY, 'invalid'); window.dispatchEvent(new StorageEvent('storage', { key: CHATROOM_STYLE_KEY })) })
  expect(styles.getSnapshot().style).toBe('qq2007')
  stop()
})
