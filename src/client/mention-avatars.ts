import type { ChatroomClientStore, ChatroomView } from './store.js'
import { newGroupMentionName } from './store.js'
import { chatroomAvatar } from '../avatars.js'
import { classicAvatarUrl, createAvatarImage, safeAvatarUrl } from './avatar-images.js'

const SOURCES = ['群聊成员', 'AI 成员', 'AI 助手'] as const
const MEMBER_OPTION_SELECTOR = SOURCES.map(source => `button[id^="dsh-slash-option-${source}-"]`).join(', ')
const AVATAR_CLASS = 'dsh-chatroom-native-mention-avatar'

/** Use the same classic/enterprise avatar in native member and AI candidates. */
export function installNativeMentionAvatarImages(store: ChatroomClientStore): () => void {
  const reconcile = (): void => {
    const avatars = mentionAvatarUrls(store.getSnapshot())
    for (const option of document.querySelectorAll<HTMLButtonElement>(MEMBER_OPTION_SELECTOR)) {
      // Host 0.1.2 omits the leading aria-hidden span when item.icon is absent.
      // Our sources intentionally provide no native icon, so name is then first.
      const first = option.firstElementChild
      let icon = first instanceof HTMLElement && first.getAttribute('aria-hidden') === 'true' ? first : null
      const name = (icon === null ? first : icon.nextElementSibling)?.textContent?.trim()
      if (name === undefined || name === '') continue
      const source = SOURCES.find(value => option.id.startsWith(`dsh-slash-option-${value}-`))
      const avatar = avatars.get(`${source}:${name}`)
      const existing = icon?.querySelector<HTMLImageElement>(`:scope > img.${AVATAR_CLASS}`) ?? null
      if (avatar === undefined) {
        existing?.remove()
        if (icon?.dataset.dshChatroomOwnedIcon === 'true') icon.remove()
        else if (icon !== null) {
          icon.classList.remove(AVATAR_CLASS)
          delete icon.dataset.dshChatroomAvatarKey
        }
        continue
      }
      if (icon === null) {
        icon = document.createElement('span')
        icon.setAttribute('aria-hidden', 'true')
        icon.dataset.dshChatroomOwnedIcon = 'true'
        option.prepend(icon)
      }
      if (existing !== null && icon.dataset.dshChatroomAvatarKey === avatar.key) continue
      existing?.remove()
      icon.classList.add(AVATAR_CLASS)
      icon.dataset.dshChatroomAvatarKey = avatar.key
      const image = createAvatarImage(document, avatar.fallback, avatar.remote)
      image.className = AVATAR_CLASS
      icon.prepend(image)
    }
  }
  const observer = new MutationObserver(records => {
    if (records.some(mutationAddsMentionOption)) reconcile()
  })
  observer.observe(document.body, { childList: true, subtree: true })
  const unsubscribe = store.subscribe(reconcile)
  reconcile()
  return () => {
    unsubscribe()
    observer.disconnect()
    for (const image of document.querySelectorAll<HTMLImageElement>(`img.${AVATAR_CLASS}`)) {
      const icon = image.parentElement
      image.remove()
      if (icon?.dataset.dshChatroomOwnedIcon === 'true') {
        icon.remove()
        continue
      }
      icon?.classList.remove(AVATAR_CLASS)
      if (icon !== null && icon !== undefined) delete icon.dataset.dshChatroomAvatarKey
    }
  }
}

function mutationAddsMentionOption(record: MutationRecord): boolean {
  return [...record.addedNodes].some(node =>
    node instanceof Element
    && (node.matches(MEMBER_OPTION_SELECTOR) || node.querySelector(MEMBER_OPTION_SELECTOR) !== null))
}

function mentionAvatarUrls(snapshot: ChatroomView) {
  const avatars = new Map<string, { key: string; fallback: string; remote: string | undefined }>()
  const add = (source: string, name: string, id: string | undefined, seed: string, url?: string): void => {
    const remote = safeAvatarUrl(url)
    avatars.set(`${source}:${name}`, {
      key: `${chatroomAvatar(id, seed).id}:${remote ?? ''}`,
      fallback: classicAvatarUrl(id, seed), remote,
    })
  }
  for (const member of snapshot.members) {
    add('群聊成员', member.displayName, member.avatarId, member.participantId, member.avatarUrl)
  }
  for (const peer of snapshot.directPeers) {
    add('群聊成员', newGroupMentionName(peer, snapshot.directPeers), peer.avatarId, peer.participantId, peer.avatarUrl)
  }
  for (const profile of snapshot.agentProfiles?.profiles ?? []) {
    if (profile.roomId === snapshot.room?.id) add('AI 成员', profile.name, profile.avatarId, `chatroom-agent-${profile.id}`)
  }
  add('AI 助手', `${snapshot.room?.aiDisplayName ?? 'DeepSeek'}（AI 助手）`, undefined, 'ai')
  return avatars
}
