import { chatroomAvatar } from '../avatars.js'
import { CLASSIC_AVATAR_IMAGES } from './classic-avatar-data.js'

/** A trusted embedded bitmap, never a visitor request to the source repository. */
export function classicAvatarUrl(avatarId: string | undefined, seed: string): string {
  return CLASSIC_AVATAR_IMAGES[chatroomAvatar(avatarId, seed).imageIndex]!
}

export function safeAvatarUrl(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.username === '' && url.password === '' && url.hash === ''
      ? url.href : undefined
  } catch {
    return undefined
  }
}

/** Shared image/fallback behavior for the native sidebar and mention DOM. */
export function createAvatarImage(document: Document, fallback: string, remote?: string): HTMLImageElement {
  const image = document.createElement('img')
  image.alt = ''
  image.referrerPolicy = 'no-referrer'
  const verified = safeAvatarUrl(remote)
  image.src = verified ?? fallback
  if (verified !== undefined) image.addEventListener('error', () => { image.src = fallback }, { once: true })
  return image
}
