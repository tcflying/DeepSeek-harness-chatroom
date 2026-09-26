import { type ChatroomAvatarId } from '../avatars.js'
import { ChatroomAvatar } from './ChatroomAvatar.js'

interface ChatroomAvatarViewProps {
  readonly participantId: string
  readonly avatarId: ChatroomAvatarId
  readonly avatarUrl?: string
  readonly className: string
  readonly title?: string
}

/** Reuse the shared classic-avatar renderer in member and private-chat surfaces. */
export function ChatroomAvatarView(props: ChatroomAvatarViewProps): JSX.Element {
  return <ChatroomAvatar
    className={props.className}
    avatarId={props.avatarId}
    avatarUrl={props.avatarUrl}
    seed={props.participantId}
    {...(props.title === undefined ? {} : { title: props.title })}
  />
}
