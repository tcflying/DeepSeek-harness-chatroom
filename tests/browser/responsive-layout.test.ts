import { afterEach, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { CHATROOM_STYLES } from '../../src/client/styles.js'

afterEach(async () => {
  await page.viewport(1280, 720)
  document.documentElement.style.cssText = ''
  document.head.replaceChildren()
  document.body.replaceChildren()
})

function mountResponsiveFixture(scheme: 'light' | 'dark'): void {
  document.documentElement.style.colorScheme = scheme
  document.documentElement.style.setProperty('--bg-primary', scheme === 'dark' ? '#151517' : '#fff')
  document.documentElement.style.setProperty('--bg-secondary', scheme === 'dark' ? '#242428' : '#f3f4f6')
  document.documentElement.style.setProperty('--text-primary', scheme === 'dark' ? '#f9fafb' : '#111827')
  const style = document.createElement('style')
  style.textContent = `${CHATROOM_STYLES}
    body { margin: 0; }
    .fixture-header { width: 100%; }
    .fixture-long-url { max-width: 100%; }
  `
  document.head.append(style)
  document.body.innerHTML = `
    <div class="fixture-header">
      <span class="dsh-chatroom-header-actions">
        <span class="dsh-chatroom-identity-action">A deliberately very long room identity and online presence label</span>
        <span class="dsh-chatroom-agent-roster" aria-label="Room agents">
          <span>Agent 12</span><button class="dsh-chatroom-manage-action">An exceptionally long AI participant name</button>
          <button class="dsh-chatroom-manage-action">Another agent still running</button><button class="dsh-chatroom-manage-action">Refresh</button>
          <small>Long agent hint that must not create another mobile header line.</small>
        </span>
        <button class="dsh-chatroom-manage-action">AI members</button><button class="dsh-chatroom-manage-action">Manage room</button>
      </span>
    </div>
    <aside class="dsh-chatroom-member-card">
      <div class="dsh-chatroom-invite"><div class="dsh-chatroom-invite-heading"><div><strong>Group management</strong><small>Long administration description</small></div><span>2 selected</span></div></div>
      <div class="dsh-chatroom-member"><span class="dsh-chatroom-member-avatar">A</span><span><strong>A very long participant name that is safely truncated</strong><small>member</small></span><i data-online="true"></i></div>
    </aside>
    <section class="dsh-chatroom-direct-panel">
      <header><span class="dsh-chatroom-direct-header-avatar">A</span><div><strong>Long direct conversation title</strong><small>long username and status that should ellipsize</small></div></header>
      <div class="dsh-chatroom-direct-messages"><article class="dsh-chatroom-participant-message dsh-chatroom-direct-message"><span class="dsh-chatroom-direct-message-avatar">B</span><div class="dsh-chatroom-message-column"><span class="dsh-chatroom-human-bubble fixture-long-url">https://example.com/a/really/long/path/that/should/wrap/without/creating/a/horizontal/page/scroll?with=a-long-query-string</span><a class="dsh-chatroom-direct-file"><span>file</span><span><strong>very-long-file-name-that-must-not-overflow-the-mobile-composer-or-message-column.txt</strong><small>20 KB</small></span><span>Download</span></a></div></article></div>
      <form class="dsh-chatroom-direct-composer"><textarea aria-label="Message"></textarea><div class="dsh-chatroom-direct-pending-files"><span><span>file</span><span>another-very-long-file-name-for-small-screens.pdf</span><button type="button">Remove</button></span></div><div class="dsh-chatroom-direct-composer-tools"><button type="button">Emoji</button><button type="button">File</button><small>A long assistive hint stays readable or clips safely</small><button class="dsh-chatroom-direct-send" type="submit">↑</button></div></form>
    </section>
    <section class="dsh-chatroom-settings"><details class="dsh-chatroom-settings-advanced"><summary>Advanced model instructions</summary><textarea>Long configuration</textarea></details></section>
  `
}

describe('responsive Chatroom additions in a real browser', () => {
  it.each([320, 360, 390, 768, 1280])('keeps header, group drawer, direct composer, and long URLs inside %ipx', async width => {
    await page.viewport(width, 800)
    mountResponsiveFixture(width === 360 ? 'dark' : 'light')

    const header = required<HTMLElement>('.dsh-chatroom-header-actions')
    const roster = required<HTMLElement>('.dsh-chatroom-agent-roster')
    const drawer = required<HTMLElement>('.dsh-chatroom-member-card')
    const direct = required<HTMLElement>('.dsh-chatroom-direct-panel')
    const composer = required<HTMLElement>('.dsh-chatroom-direct-composer')
    const url = required<HTMLElement>('.fixture-long-url')
    const file = required<HTMLElement>('.dsh-chatroom-direct-file')
    const summary = required<HTMLElement>('.dsh-chatroom-settings-advanced > summary')

    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width)
    expect(header.getBoundingClientRect().right).toBeLessThanOrEqual(width)
    expect(drawer.getBoundingClientRect().left).toBeGreaterThanOrEqual(0)
    expect(drawer.getBoundingClientRect().right).toBeLessThanOrEqual(width)
    expect(direct.getBoundingClientRect().left).toBe(0)
    expect(direct.getBoundingClientRect().right).toBe(width)
    expect(composer.getBoundingClientRect().left).toBeGreaterThanOrEqual(0)
    expect(composer.getBoundingClientRect().right).toBeLessThanOrEqual(width)
    expect(getComputedStyle(url).overflowWrap).toBe('anywhere')
    expect(url.getBoundingClientRect().right).toBeLessThanOrEqual(direct.getBoundingClientRect().right)
    expect(file.getBoundingClientRect().right).toBeLessThanOrEqual(direct.getBoundingClientRect().right)
    expect(summary.getBoundingClientRect().height).toBeGreaterThanOrEqual(38)

    if (width <= 640) {
      expect(getComputedStyle(header).overflowX).toBe('auto')
      expect(getComputedStyle(roster).overflowX).toBe('auto')
      expect(getComputedStyle(roster).flexWrap).toBe('nowrap')
      expect(required<HTMLButtonElement>('.dsh-chatroom-header-actions > .dsh-chatroom-manage-action').getBoundingClientRect().height).toBeGreaterThanOrEqual(40)
    } else {
      expect(getComputedStyle(roster).flexWrap).toBe('wrap')
    }
  })

  it('uses the host dark theme variables for the direct surface and keeps advanced settings collapsed', async () => {
    await page.viewport(390, 800)
    mountResponsiveFixture('dark')
    const direct = required<HTMLElement>('.dsh-chatroom-direct-panel')
    const advanced = required<HTMLDetailsElement>('.dsh-chatroom-settings-advanced')
    const textarea = required<HTMLTextAreaElement>('.dsh-chatroom-settings-advanced textarea')

    expect(getComputedStyle(direct).backgroundColor).toBe('rgb(21, 21, 23)')
    expect(advanced.open).toBe(false)
    expect(textarea.checkVisibility({ contentVisibilityAuto: true })).toBe(false)
    advanced.open = true
    await expect.poll(() => textarea.checkVisibility({ contentVisibilityAuto: true })).toBe(true)
  })
})

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (element === null) throw new Error(`Missing fixture element: ${selector}`)
  return element
}
