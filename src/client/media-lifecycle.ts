import { useEffect, useState, type RefObject } from 'react'

/** Page visibility is separate from a submitted server-side operation's lifetime. */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden')
  useEffect(() => {
    const update = () => setVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return visible
}

export function useNearViewport(ref: RefObject<Element | null>): boolean {
  const [near, setNear] = useState(typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(entries => setNear(entries.some(entry => entry.isIntersecting)), { rootMargin: '240px' })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref])
  return near
}

export const mediaThumbnailUrl = (url: string): string => /^\/plugins\/deepseek-harness-chatroom\/api\/(files|images)\//u.test(url)
  ? `${url}${url.includes('?') ? '&' : '?'}preview=thumbnail` : url

/** Native dialogs receive clicks for both their content box and modal backdrop. */
export const isDialogBackdropClick = (dialog: HTMLDialogElement, clientX: number, clientY: number): boolean => {
  const bounds = dialog.getBoundingClientRect()
  return clientX < bounds.left || clientX > bounds.right || clientY < bounds.top || clientY > bounds.bottom
}
