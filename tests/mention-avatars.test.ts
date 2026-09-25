// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { installNativeMentionAvatarImages } from '../src/client/mention-avatars.js'
import { classicAvatarUrl } from '../src/client/avatar-images.js'
import type { ChatroomClientStore, ChatroomView } from '../src/client/store.js'

afterEach(() => {
  document.body.replaceChildren()
})

describe('native mention avatars', () => {
  const settleMutations = async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 0))
  }

  it('uses account avatars and falls back to the matching classic bitmap after failure', () => {
    const option = document.createElement('button')
    option.id = 'dsh-slash-option-群聊成员-0'
    option.innerHTML = '<span aria-hidden="true">🐼</span><span>Bob</span>'
    document.body.append(option)
    const subscribe = vi.fn(() => () => undefined)
    const store = {
      getSnapshot: () => ({
        members: [{
          participantId: 'bob-id', displayName: 'Bob', avatarId: 'panda',
          avatarUrl: 'https://ioa.example.com/bob.png', joinedAt: 1, lastSeenAt: 1, online: true,
        }],
        directPeers: [],
      } as unknown as ChatroomView),
      subscribe,
    } as unknown as ChatroomClientStore

    const dispose = installNativeMentionAvatarImages(store)
    const icon = option.firstElementChild as HTMLElement
    const image = icon.querySelector('img')
    expect(image?.src).toBe('https://ioa.example.com/bob.png')
    expect(image?.referrerPolicy).toBe('no-referrer')
    expect(icon.textContent).toBe('🐼')

    image?.dispatchEvent(new Event('error'))
    expect(icon.querySelector('img')?.src).toBe(classicAvatarUrl('panda', 'bob-id'))
    expect(icon.classList.contains('dsh-chatroom-native-mention-avatar')).toBe(true)

    dispose()
  })

  it('rejects non-HTTPS account avatar URLs', () => {
    const option = document.createElement('button')
    option.id = 'dsh-slash-option-群聊成员-0'
    option.innerHTML = '<span aria-hidden="true">🐼</span><span>Bob</span>'
    document.body.append(option)
    const store = {
      getSnapshot: () => ({
        members: [{
          participantId: 'bob-id', displayName: 'Bob', avatarId: 'panda',
          avatarUrl: 'http://ioa.example.com/bob.png', joinedAt: 1, lastSeenAt: 1, online: true,
        }],
        directPeers: [],
      } as unknown as ChatroomView),
      subscribe: () => () => undefined,
    } as unknown as ChatroomClientStore

    const dispose = installNativeMentionAvatarImages(store)
    expect(option.querySelector('img')?.src).toBe(classicAvatarUrl('panda', 'bob-id'))
    dispose()
  })

  it('ignores unrelated conversation mutations and reacts when the member menu opens', async () => {
    const getSnapshot = vi.fn(() => ({
      members: [{
        participantId: 'bob-id', displayName: 'Bob', avatarId: 'panda',
        avatarUrl: 'https://ioa.example.com/bob.png', joinedAt: 1, lastSeenAt: 1, online: true,
      }],
      directPeers: [],
    } as unknown as ChatroomView))
    const store = {
      getSnapshot,
      subscribe: () => () => undefined,
    } as unknown as ChatroomClientStore
    const dispose = installNativeMentionAvatarImages(store)
    getSnapshot.mockClear()

    document.body.append(document.createElement('p'))
    await settleMutations()
    expect(getSnapshot).not.toHaveBeenCalled()

    const option = document.createElement('button')
    option.id = 'dsh-slash-option-群聊成员-0'
    option.innerHTML = '<span aria-hidden="true">🐼</span><span>Bob</span>'
    document.body.append(option)
    await settleMutations()
    expect(option.querySelector('img')?.src).toBe('https://ioa.example.com/bob.png')
    dispose()
  })

  it('adds classic avatars to the pinned Host name/description markup without an icon', async () => {
    const store = {
      getSnapshot: () => ({
        room: { id: 'room', aiDisplayName: 'DeepSeek' },
        members: [{ participantId: 'bob-id', displayName: 'Bob', avatarId: 'qq-25' }],
        directPeers: [],
        agentProfiles: { profiles: [{ id: 'writer', roomId: 'room', name: 'Writer' }] },
      } as unknown as ChatroomView),
      subscribe: () => () => undefined,
    } as unknown as ChatroomClientStore
    const dispose = installNativeMentionAvatarImages(store)
    const candidates = [
      ['群聊成员', 'Bob', '群成员', classicAvatarUrl('qq-25', 'bob-id')],
      ['AI 成员', 'Writer', '提及后回复', classicAvatarUrl(undefined, 'chatroom-agent-writer')],
      ['AI 助手', 'DeepSeek（AI 助手）', '在线成员', classicAvatarUrl(undefined, 'ai')],
    ] as const
    for (const [source, name, description] of candidates) {
      const option = document.createElement('button')
      option.id = `dsh-slash-option-${source}-0`
      option.innerHTML = `<span>${name}</span><span>${description}</span>`
      document.body.append(option)
    }
    await settleMutations()
    for (const [source, name, description, expected] of candidates) {
      const option = document.getElementById(`dsh-slash-option-${source}-0`)!
      expect(option.querySelector('img')?.src).toBe(expected)
      expect(option.children).toHaveLength(3)
      expect(option.children[1]?.textContent).toBe(name)
      expect(option.children[2]?.textContent).toBe(description)
    }
    dispose()
    for (const option of document.querySelectorAll('button')) {
      expect(option.children).toHaveLength(2)
      expect(option.querySelector('img')).toBeNull()
    }
  })
})
