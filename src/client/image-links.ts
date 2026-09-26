import type { ChatroomFileReference } from '../types.js'
import { CHATROOM_API_PREFIX } from '../routes.js'

/** Recover only explicit same-origin file image links, never arbitrary remote URLs. */
export function projectImageLinks(text: string, files: readonly ChatroomFileReference[]) {
  const images = new Map<string, { url: string; alt: string }>()
  const linkedIds = new Set<string>()
  let visible = text.replace(/!\[([^\]\n]*)\]\(\/plugins\/deepseek-harness-chatroom\/api\/files\/([0-9a-f]{8}-[0-9a-f-]{27})\)/giu,
    (link, alt: string, id: string) => {
      const file = files.find(file => file.id === id)
      if (file && !file.mediaType.startsWith('image/')) return link
      linkedIds.add(id)
      if (!file) images.set(id, { url: `${CHATROOM_API_PREFIX}/files/${id}`, alt: alt || '图片' })
      return ''
    })
  // Models sometimes echo a damaged JSON marker. Do not invent/fix metadata:
  // suppress that bounded marker only when it matches an explicit image link.
  visible = visible.replace(/\u2063dsh-chatroom-file:([^\u2063\n]{1,8192})\u2063(?:文件：[^\s\u2063]+)?/gu, (marker, encoded: string) => {
    try {
      const decoded = decodeURIComponent(encoded)
      const id = /"id"\s*:\s*"([0-9a-f-]{36})"/iu.exec(decoded)?.[1]
      return id && linkedIds.has(id) ? '' : marker
    } catch { return marker }
  })
  return { text: visible.trimEnd(), images: [...images.values()] }
}
