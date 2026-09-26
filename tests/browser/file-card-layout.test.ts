import { afterEach, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { CHATROOM_STYLES } from '../../src/client/styles.js'
import { QQ2007_STYLES } from '../../src/client/qq2007-styles.js'

afterEach(() => {
  document.body.replaceChildren()
  document.head.querySelectorAll('[data-file-layout-test]').forEach(element => element.remove())
  document.documentElement.removeAttribute('data-dsh-chatroom-style')
  document.documentElement.removeAttribute('data-dsh-chatroom-installed')
})

it('keeps the original-image dialog and touch controls within 320px, 390px and desktop viewports', async () => {
  const sheet = document.createElement('style')
  sheet.dataset.fileLayoutTest = ''
  sheet.textContent = CHATROOM_STYLES + QQ2007_STYLES
  document.head.append(sheet)
  document.documentElement.setAttribute('data-dsh-chatroom-installed', '')
  document.body.innerHTML = '<dialog class="dsh-chatroom-image-viewer"><header><span>水墨擎天柱</span><a href="#">下载原图</a><button>关闭大图</button></header><img width="1024" height="1536" alt="preview"></dialog>'
  const dialog = document.querySelector('dialog')!
  dialog.showModal()
  for (const skin of ['default', 'qq2007']) {
    document.documentElement.dataset.dshChatroomStyle = skin
    for (const width of [320, 390, 926, 1440]) {
      await page.viewport(width, 844)
      const rect = dialog.getBoundingClientRect()
      expect(rect.left, `${skin}/${width}`).toBeGreaterThanOrEqual(11)
      expect(rect.right, `${skin}/${width}`).toBeLessThanOrEqual(width - 11)
      expect(rect.bottom).toBeLessThanOrEqual(844)
      expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth)
      for (const button of dialog.querySelectorAll('button,a')) {
        const bounds = button.getBoundingClientRect()
        expect(bounds.height).toBeGreaterThanOrEqual(44)
        expect(bounds.right).toBeLessThanOrEqual(rect.right)
      }
    }
  }
  dialog.close()
})

it('keeps long image download names and their action inside narrow message columns in both skins', () => {
  const sheet = document.createElement('style')
  sheet.dataset.fileLayoutTest = ''
  sheet.textContent = CHATROOM_STYLES + QQ2007_STYLES
  document.head.append(sheet)
  document.documentElement.setAttribute('data-dsh-chatroom-installed', '')
  document.body.innerHTML = '<div class="dsh-chatroom-image-file"><a class="dsh-chatroom-file-card"><span class="dsh-chatroom-file-icon">📎</span><span class="dsh-chatroom-file-copy"><strong>generated-d670473e-7a7e-4894-8c9b-fd5e27b0c10a.png</strong><small>1.7 MB</small></span><span data-download>↓</span></a></div>'
  const container = document.querySelector<HTMLElement>('.dsh-chatroom-image-file')!
  const card = document.querySelector('.dsh-chatroom-file-card')!
  const action = document.querySelector('[data-download]')!
  for (const style of ['default', 'qq2007']) {
    document.documentElement.dataset.dshChatroomStyle = style
    for (const width of [180, 232.8, 420]) {
      container.style.width = `${width}px`
      const outer = container.getBoundingClientRect()
      const bounds = card.getBoundingClientRect()
      expect(bounds.width, `${style} / ${width}`).toBeLessThanOrEqual(outer.width + 0.1)
      expect(action.getBoundingClientRect().right).toBeLessThanOrEqual(outer.right + 0.1)
    }
  }
})
