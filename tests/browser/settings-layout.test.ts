import { afterEach, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { CHATROOM_STYLES } from '../../src/client/styles.js'

afterEach(async () => {
  await page.viewport(1280, 720)
  document.head.replaceChildren()
  document.body.replaceChildren()
})

describe('settings layout in a real browser', () => {
  it('keeps collapsed advanced configuration reachable without narrow-screen overflow', async () => {
    await page.viewport(390, 844)
    const style = document.createElement('style')
    style.textContent = `${CHATROOM_STYLES} body { margin: 0; }`
    document.head.append(style)
    document.body.innerHTML = `
      <main class="dsh-chatroom-settings">
        <section class="dsh-chatroom-card dsh-chatroom-prompt-card">
          <details class="dsh-chatroom-settings-advanced">
            <summary>编辑系统提示词</summary>
            <div class="dsh-chatroom-prompt-form"><label>主 Agent<textarea></textarea></label></div>
          </details>
        </section>
      </main>`

    const settings = document.querySelector<HTMLElement>('.dsh-chatroom-settings')!
    const advanced = document.querySelector<HTMLDetailsElement>('.dsh-chatroom-settings-advanced')!
    const summary = advanced.querySelector<HTMLElement>('summary')!
    expect(advanced.open).toBe(false)
    expect(settings.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth)
    expect(summary.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth)
    summary.click()
    expect(advanced.open).toBe(true)
    expect(advanced.querySelector('textarea')!.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth)
  })
})
