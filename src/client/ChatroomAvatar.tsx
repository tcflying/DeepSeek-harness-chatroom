import { useEffect, useState } from 'react'
import { chatroomAvatar } from '../avatars.js'
import { classicAvatarUrl, safeAvatarUrl } from './avatar-images.js'

export interface ChatroomAvatarProps {
  readonly avatarId?: string | undefined
  readonly avatarUrl?: string | undefined
  readonly seed: string
  readonly className?: string
  readonly title?: string
}

/** One safe avatar surface shared by members, contacts, identities, and messages. */
export function ChatroomAvatar({ avatarId, avatarUrl, seed, className = 'dsh-chatroom-avatar', title }: ChatroomAvatarProps): JSX.Element {
  const [failed, setFailed] = useState(false)
  const fallback = chatroomAvatar(avatarId, seed)
  const remoteUrl = safeAvatarUrl(avatarUrl)
  useEffect(() => { setFailed(false) }, [remoteUrl])
  return <span
    className={className}
    data-avatar={fallback.id}
    data-avatar-source={remoteUrl === undefined || failed ? 'classic' : 'enterprise'}
    title={title ?? fallback.label}
    aria-label={title ?? fallback.label}
  >
    <img
      src={remoteUrl !== undefined && !failed ? remoteUrl : classicAvatarUrl(avatarId, seed)}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => { setFailed(true) }}
    />
  </span>
}
