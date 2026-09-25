import { CHATROOM_AVATARS, type ChatroomAvatarId } from '../avatars.js'
import { ChatroomAvatar } from './ChatroomAvatar.js'
import { classicAvatarUrl } from './avatar-images.js'

/** Same curated choices as human accounts; no remote URL or credential input. */
export function AgentAvatarPicker({ value, onChange, disabled = false }: { value: ChatroomAvatarId; onChange(value: ChatroomAvatarId): void; disabled?: boolean }): JSX.Element {
  return <details className="dsh-chatroom-agent-avatar-picker">
    <summary><ChatroomAvatar avatarId={value} seed="ai" /><span>更换 AI 头像</span><span aria-hidden>▾</span></summary>
    <div className="dsh-chatroom-avatar-grid" role="group" aria-label="选择 AI 头像">
      {CHATROOM_AVATARS.map(avatar => <button key={avatar.id} type="button" className="dsh-chatroom-avatar-choice"
        data-selected={value === avatar.id} aria-pressed={value === avatar.id} aria-label={avatar.label} disabled={disabled}
        onClick={() => onChange(avatar.id)}><img src={classicAvatarUrl(avatar.id, '')} alt="" /></button>)}
    </div>
  </details>
}
