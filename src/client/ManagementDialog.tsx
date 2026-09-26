import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** A browser top-layer dialog, independent of host/plugin sidebar stacking contexts. */
export function ManagementDialog({ title, closeLabel, onClose, children }: {
  title: string
  closeLabel: string
  onClose(): void
  children: ReactNode
}): JSX.Element {
  const dialog = useRef<HTMLDialogElement>(null)
  useLayoutEffect(() => {
    const element = dialog.current!
    const previous = document.activeElement as HTMLElement | null
    if (element.showModal) element.showModal()
    else element.setAttribute('open', '')
    return () => {
      element.close?.()
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return createPortal(<dialog ref={dialog} className="dsh-chatroom-management-dialog" role="dialog"
    aria-label={title} aria-modal="true"
    onCancel={event => { event.preventDefault(); onClose() }}
    onClick={event => {
      if (event.target !== event.currentTarget) return
      const rect = event.currentTarget.getBoundingClientRect()
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose()
    }}>
    <header><h2>{title}</h2><button type="button" aria-label={closeLabel} onClick={onClose}>×</button></header>
    <div className="dsh-chatroom-management-content">{children}</div>
  </dialog>, document.body)
}
