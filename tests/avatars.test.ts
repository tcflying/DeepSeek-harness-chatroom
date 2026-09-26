import { describe, expect, it } from 'vitest'
import { CHATROOM_AVATARS, chatroomAvatar, fallbackAvatarId, isChatroomAvatarId } from '../src/avatars.js'
import { CLASSIC_AVATAR_IMAGES } from '../src/client/classic-avatar-data.js'
import { classicAvatarUrl } from '../src/client/avatar-images.js'

describe('classic QQ avatar compatibility', () => {
  it('offers exactly 100 embedded original PNG avatars, not emoji or remote hotlinks', () => {
    expect(CHATROOM_AVATARS).toHaveLength(100)
    expect(new Set(CHATROOM_AVATARS.map(avatar => avatar.id)).size).toBe(100)
    expect(CLASSIC_AVATAR_IMAGES).toHaveLength(100)
    expect(new Set(CLASSIC_AVATAR_IMAGES).size).toBe(100)
    for (const avatar of CHATROOM_AVATARS) {
      expect(avatar.id).toMatch(/^qq-\d+$/)
      expect(avatar.label).toMatch(/^QQ 2007 经典头像 \d{3}$/)
      const url = classicAvatarUrl(avatar.id, '')
      expect(url).toMatch(/^data:image\/png;base64,/)
      const bytes = Buffer.from(url.split(',')[1]!, 'base64')
      expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
      expect(bytes.readUInt32BE(16)).toBeGreaterThan(0)
      expect(bytes.readUInt32BE(20)).toBeGreaterThan(0)
    }
  })

  it('accepts every legacy marker and maps it to the same default without a database rewrite', () => {
    const legacy = ['whale', 'panda', 'fox', 'cat', 'dog', 'rabbit', 'octopus', 'unicorn']
    for (const [index, id] of legacy.entries()) {
      expect(isChatroomAvatarId(id)).toBe(true)
      expect(chatroomAvatar(id, 'any-person').id).toBe(`qq-${index + 1}`)
    }
    for (const seed of ['alice', 'bob', 'chatroom-agent-profile-a', 'old-unmarked-speaker']) {
      let hash = 0
      for (const character of seed) hash = (hash * 31 + character.codePointAt(0)!) >>> 0
      expect(chatroomAvatar(fallbackAvatarId(seed), seed).id).toBe(chatroomAvatar(legacy[hash % 8], seed).id)
    }
  })

  it('validates new choices while rejecting out-of-range or prototype names', () => {
    for (const id of ['qq-1', 'qq-58', 'qq-100']) expect(isChatroomAvatarId(id)).toBe(true)
    for (const id of ['qq-0', 'qq-101', 'qq-001', '__proto__', 'constructor', '', null, 1]) expect(isChatroomAvatarId(id)).toBe(false)
  })
})
