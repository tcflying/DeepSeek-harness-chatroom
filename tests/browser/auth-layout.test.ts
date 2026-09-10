import { afterEach, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { CHATROOM_STYLES } from '../../src/client/styles.js'

afterEach(async () => {
  await page.viewport(1280, 720)
  document.head.replaceChildren()
  document.body.replaceChildren()
})

describe('narrow-screen authentication layout in a real browser', () => {
  it('keeps the login card and controls inside a 390px viewport', async () => {
    await page.viewport(390, 844)
    const style = document.createElement('style')
    style.textContent = `${CHATROOM_STYLES} body { margin: 0; }`
    document.head.append(style)
    document.body.innerHTML = `
      <main class="dsh-chatroom-dialog-layer">
        <section class="dsh-chatroom-card dsh-chatroom-auth-card">
          <form>
            <label>账号<input /></label>
            <label>密码<input type="password" /></label>
            <button type="submit">登录</button>
          </form>
        </section>
      </main>`

    const card = document.querySelector<HTMLElement>('.dsh-chatroom-auth-card')!
    expect(card.getBoundingClientRect().left).toBeGreaterThanOrEqual(0)
    expect(card.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth)
    for (const control of card.querySelectorAll<HTMLElement>('input, button')) {
      expect(control.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth)
    }
  })
})
