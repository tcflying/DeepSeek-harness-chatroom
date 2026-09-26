import { useEffect, useRef } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'

export const WELCOME_NOTICE_SLOT = {
  name: 'settings.onboarding',
  id: 'welcome-notice',
  order: -100,
  priority: -100,
} as const

/** Suppress only the non-binding preview notice, through the native slot cell. */
export function installWelcomeNoticeSuppression(ctx: Context): void {
  ctx.slots.inject('settings.onboarding', () => ctx.slots.register(
    WELCOME_NOTICE_SLOT, SkipWelcomeNotice,
  ))
}

/** Complete the native step; rendering null alone would stall later onboarding. */
export function SkipWelcomeNotice({ complete }: { complete: () => void }): null {
  const completed = useRef(false)
  useEffect(() => {
    if (completed.current) return
    completed.current = true
    complete()
  }, [complete])
  return null
}
