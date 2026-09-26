/** Classic QQ choices; the image bytes belong only to the browser bundle. */
export const CHATROOM_AVATARS = Array.from({ length: 100 }, (_, index) => ({
  id: `qq-${index + 1}` as `qq-${number}`,
  label: `QQ 2007 经典头像 ${String(index + 1).padStart(3, '0')}`,
  imageIndex: index,
}))

// Accept persisted identifiers without rewriting accounts or historical markers.
const LEGACY_AVATARS = {
  whale: 'qq-1', panda: 'qq-2', fox: 'qq-3', cat: 'qq-4',
  dog: 'qq-5', rabbit: 'qq-6', octopus: 'qq-7', unicorn: 'qq-8',
} as const

/** Stable id of one built-in chatroom avatar. */
export type ChatroomAvatarId = (typeof CHATROOM_AVATARS)[number]['id'] | keyof typeof LEGACY_AVATARS

/** Whether an untrusted string names one built-in avatar. */
export function isChatroomAvatarId(value: unknown): value is ChatroomAvatarId {
  return typeof value === 'string'
    && (Object.hasOwn(LEGACY_AVATARS, value) || CHATROOM_AVATARS.some(avatar => avatar.id === value))
}

/** Deterministic fallback for identities and old transcript markers without an avatar. */
export function fallbackAvatarId(seed: string): ChatroomAvatarId {
  let hash = 0
  for (const character of seed) hash = (hash * 31 + character.codePointAt(0)!) >>> 0
  // Keep the pre-upgrade default assignment stable in older transcript markers.
  const legacyDefaults = Object.values(LEGACY_AVATARS)
  return legacyDefaults[hash % legacyDefaults.length]!
}

/** Display metadata for one validated or historical avatar id. */
export function chatroomAvatar(value: string | undefined, seed: string) {
  const id = value !== undefined && Object.hasOwn(LEGACY_AVATARS, value)
    ? LEGACY_AVATARS[value as keyof typeof LEGACY_AVATARS]
    : isChatroomAvatarId(value) ? value : fallbackAvatarId(seed)
  return CHATROOM_AVATARS.find(avatar => avatar.id === id)!
}
