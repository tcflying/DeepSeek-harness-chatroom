/** Safe, authenticated gallery items; URLs always point back to this plugin. */
export interface GalleryItem {
  id: string
  url: string
  name: string
  mediaType: string
  createdAt: number
  fileId?: string
}
export interface GalleryPage { items: GalleryItem[]; next?: number }

/** Single HTTP byte range, including suffix ranges; reject multipart/overflow. */
export function mediaByteRange(header: string, length: number): { start: number; end: number } | undefined {
  const match = /^bytes=(\d*)-(\d*)$/u.exec(header)
  if (!match || (!match[1] && !match[2]) || length <= 0) return undefined
  const first = match[1] ? Number(match[1]) : undefined, last = match[2] ? Number(match[2]) : undefined
  if ((first !== undefined && !Number.isSafeInteger(first)) || (last !== undefined && !Number.isSafeInteger(last))) return undefined
  const start = first ?? Math.max(0, length - (last ?? 0)), end = first === undefined ? length - 1 : Math.min(length - 1, last ?? length - 1)
  return start >= 0 && start < length && end >= start ? { start, end } : undefined
}
