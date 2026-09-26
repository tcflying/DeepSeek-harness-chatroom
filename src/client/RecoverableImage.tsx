import { useEffect, useRef, useState } from 'react'
import { MediaGallery, type GalleryScope } from './MediaGallery.js'
import { mediaThumbnailUrl, useNearViewport, usePageVisible } from './media-lifecycle.js'

export const CHATROOM_RECONNECTED = 'dsh-chatroom:reconnected'

/** Retry only the file GET, never the paid generation. Hidden pages drop image sources. */
export function RecoverableImage({ url, alt, roomId, sessionId }: { url: string; alt: string } & GalleryScope): JSX.Element {
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const opener = useRef<HTMLButtonElement>(null)
  const visible = usePageVisible()
  const near = useNearViewport(opener)
  const close = () => { setExpanded(false); opener.current?.focus() }
  const thumbnail = mediaThumbnailUrl(url)
  useEffect(() => { setFailed(false); setAttempt(0); setExpanded(false) }, [url, roomId, sessionId])
  const retry = () => { setFailed(false); setAttempt(value => value + 1) }
  useEffect(() => {
    if (!failed || !visible) return
    window.addEventListener(CHATROOM_RECONNECTED, retry)
    window.addEventListener('online', retry)
    return () => { window.removeEventListener(CHATROOM_RECONNECTED, retry); window.removeEventListener('online', retry) }
  }, [failed, visible])
  return <>
    <button ref={opener} type="button" className="dsh-chatroom-image-thumbnail" aria-label={`查看大图：${alt}`}
      onClick={() => setExpanded(true)} style={{ display: failed ? 'none' : 'inline-flex' }}>
      <img key={attempt} src={visible && near ? attempt ? `${thumbnail}${thumbnail.includes('?') ? '&' : '?'}previewRetry=${attempt}` : thumbnail : undefined}
        alt={alt} loading="lazy" decoding="async" onError={() => { if (visible && near) setFailed(true) }}
        style={{ display: 'block', width: 'auto', height: 'auto', minHeight: 64, maxWidth: '100%', maxHeight: 220, objectFit: 'contain' }} />
      <span>点击查看大图</span>
    </button>
    {failed && <button type="button" className="dsh-chatroom-preview-retry" onClick={retry}
      style={{ minHeight: 44, maxWidth: '100%', padding: '8px 12px', marginBottom: 8, whiteSpace: 'normal' }}
      title="只重新读取已有图片，不重新生成或计费">图片预览加载失败 · 点击重试</button>}
    {failed && <a className="dsh-chatroom-image-original" href={url} download>下载原图</a>}
    {expanded && <MediaGallery roomId={roomId} sessionId={sessionId} initial={{ id: url, url, name: alt, mediaType: 'image/png', createdAt: 0 }} close={close} />}
  </>
}
