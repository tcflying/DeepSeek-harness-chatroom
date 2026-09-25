// @vitest-environment jsdom
import { createElement, StrictMode } from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SlotCore, type PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots'
import { SkipWelcomeNotice, WELCOME_NOTICE_SLOT } from '../src/client/welcome-notice.js'

afterEach(cleanup)

describe('startup preview notice preference', () => {
  it('completes once without any dialog, including StrictMode and callback changes', () => {
    const complete = vi.fn()
    const view = render(createElement(StrictMode, {}, createElement(SkipWelcomeNotice, { complete })))
    expect(complete).toHaveBeenCalledOnce()
    expect(view.container.innerHTML).toBe('')
    const replacement = vi.fn()
    view.rerender(createElement(StrictMode, {}, createElement(SkipWelcomeNotice, { complete: replacement })))
    expect(replacement).not.toHaveBeenCalled()
    view.unmount()
    render(createElement(SkipWelcomeNotice, { complete }))
    expect(complete).toHaveBeenCalledTimes(2)
  })

  it.each([true, false])('shadows only welcome-notice and restores it on unload (native first: %s)', nativeFirst => {
    const slots = new SlotCore()
    slots.register({ name: 'root', children: {
      'settings.onboarding': { kind: 'list', scope: 'root' },
    } }, (props: PropsRenderSlots<'settings.onboarding'>) => {
      void props.renderSlot // Registry-only fixture: declare the native owner contract.
      return null
    })
    const nativeNotice = () => null
    const otherOnboarding = () => null
    const addNative = () => slots.register({
      name: 'settings.onboarding', id: 'welcome-notice', order: -100, priority: 0,
    }, nativeNotice)
    if (nativeFirst) addNative()
    const remove = slots.register(WELCOME_NOTICE_SLOT, SkipWelcomeNotice)
    if (!nativeFirst) addNative()
    slots.register({ name: 'settings.onboarding', id: 'deepseek-official', order: 0 }, otherOnboarding)
    const winners = slots.entriesOfSlot('settings.onboarding')
    expect(winners).toHaveLength(2)
    expect(winners.find(entry => entry.options.id === 'welcome-notice')?.component).toBe(SkipWelcomeNotice)
    expect(winners.find(entry => entry.options.id === 'deepseek-official')?.component).toBe(otherOnboarding)
    remove()
    expect(slots.entriesOfSlot('settings.onboarding').find(entry => entry.options.id === 'welcome-notice')?.component).toBe(nativeNotice)
  })
})
