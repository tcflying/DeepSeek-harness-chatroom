import { afterEach, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { CHATROOM_STYLES } from '../../src/client/styles.js'
import { CLASSIC_AVATAR_IMAGES } from '../../src/client/classic-avatar-data.js'
import { QQ2007_STYLES } from '../../src/client/qq2007-styles.js'

afterEach(async () => {
  document.head.replaceChildren()
  document.body.replaceChildren()
  document.documentElement.removeAttribute('data-dsh-chatroom-installed')
  document.documentElement.removeAttribute('data-dsh-chatroom-style')
  await page.viewport(1280, 720)
})

// The shape/default alignment is taken from the pinned 0.1.2 Host user renderer:
// userRow > userStack > images slot + bubble; no data-time-hover-root exists.
function mount(width: number, own: boolean, grouped = false): void {
  const style = document.createElement('style')
  style.textContent = `${CHATROOM_STYLES}
    body { margin: 0; padding: 10px; }
    main { width: ${width - 20}px; }
    .native-row { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
    .native-stack { display: flex; min-width: 0; max-width: min(525px,82%); flex-direction: column; align-items: flex-end; gap: 8px; }
    .native-bubble { max-width: 100%; padding: 10px 16px; border-radius: 22px; overflow-wrap: anywhere; background: #edf1ff; }
    .native-actions { display: flex; height: 28px; gap: 6px; }
  `
  document.head.append(style)
  const row = (end: boolean) => `<div class="dsh-chatroom-participant-message" data-dsh-chatroom-own="${own}" data-own="${own}" data-role="${own ? 'human' : 'ai'}" ${grouped ? `data-dsh-chatroom-group-position="${end ? 'end' : 'start'}"` : ''}>
    <span class="dsh-chatroom-avatar" data-avatar="qq-1"><img src="${CLASSIC_AVATAR_IMAGES[0]}" alt="" /></span>
    <div class="dsh-chatroom-message-column"><div class="dsh-chatroom-display-name">${own ? '我' : '对方 / AI 成员'}</div>
      <div class="dsh-chatroom-native-message"><div class="native-row"><div class="native-stack"><div data-slot="conversation.message.images" style="display:contents"></div><div class="native-bubble">${end ? '这是连续第二条消息' : '这句话应该紧靠自己的头像'}</div></div><div class="native-actions"><span>12:00</span><button>宿主复制</button></div></div></div>
      <div class="dsh-chatroom-message-actions"><button>回复</button><time>12:00</time></div>
    </div></div>`
  document.body.innerHTML = `<main>${row(false)}${grouped ? row(true) : ''}</main>`
}

describe('speaker and avatar stay together in the pinned Host layout', () => {
  it.each([320, 390, 768, 926, 1440])('aligns both sides and consecutive messages at %ipx', async width => {
    await page.viewport(width, 800)
    for (const own of [false, true]) {
      document.head.replaceChildren()
      mount(width, own, true)
      for (const row of document.querySelectorAll<HTMLElement>('.dsh-chatroom-participant-message')) {
        const avatar = row.querySelector<HTMLElement>('.dsh-chatroom-avatar')!.getBoundingClientRect()
        const bubble = row.querySelector<HTMLElement>('.native-bubble')!.getBoundingClientRect()
        const gap = own ? avatar.left - bubble.right : bubble.left - avatar.right
        expect(gap).toBeGreaterThanOrEqual(9)
        expect(gap).toBeLessThanOrEqual(11)
        expect(bubble.left).toBeGreaterThanOrEqual(0)
        expect(bubble.right).toBeLessThanOrEqual(width)
        expect(getComputedStyle(row.querySelector('.native-actions')!).display).toBe('none')
        expect(getComputedStyle(row.querySelector('.dsh-chatroom-message-actions')!).display).not.toBe('none')
      }
    }
  })

  it('keeps assistant actions horizontal inside a 320px Files-narrowed QQ conversation', async () => {
    await page.viewport(924, 800)
    const style = document.createElement('style')
    style.textContent = `${CHATROOM_STYLES}${QQ2007_STYLES}
      body { margin:0; } [data-slot] { display:contents; }
      .shell { display:grid; grid-template-columns:280px minmax(0,320px) 324px; }
      .center { min-width:0; } .native-message { width:100%; }
      .dsh-chatroom-assistant-turn { width:100%; }
    `
    document.head.append(style)
    document.documentElement.dataset.dshChatroomInstalled = ''
    document.documentElement.dataset.dshChatroomStyle = 'qq2007'
    document.body.innerHTML = `<div data-slot="root"><div class="shell"><aside>Sessions</aside><main class="center"><div data-slot="conversation"><article class="dsh-chatroom-assistant-turn"><div class="native-message">AI 图片消息</div><div class="dsh-chatroom-assistant-tools"><div class="dsh-chatroom-assistant-actions"><div class="dsh-chatroom-message-actions"><button aria-label="回复">↩ <span class="dsh-chatroom-action-label">回复</span></button><button aria-label="复制">▣ <span class="dsh-chatroom-action-label">复制</span></button><button aria-label="点赞">👍 <span class="dsh-chatroom-action-label">点赞</span></button><button aria-label="分支">⑂ <span class="dsh-chatroom-action-label">分支</span></button><button aria-label="转发">↗ <span class="dsh-chatroom-action-label">转发</span></button></div></div></div></article></div></main><aside>Files</aside></div></div>`
    const center = required<HTMLElement>('.center')
    const tools = required<HTMLElement>('.dsh-chatroom-assistant-tools')
    const actions = required<HTMLElement>('.dsh-chatroom-message-actions')
    expect(center.getBoundingClientRect().width).toBe(320)
    expect(tools.getBoundingClientRect().right).toBeLessThanOrEqual(center.getBoundingClientRect().right)
    expect(tools.scrollWidth).toBeLessThanOrEqual(tools.clientWidth)
    expect(actions.getBoundingClientRect().height).toBeLessThanOrEqual(32)
    for (const action of actions.querySelectorAll<HTMLElement>('button')) {
      expect(action.getBoundingClientRect().height).toBeLessThanOrEqual(32)
      expect(action.getBoundingClientRect().width).toBeGreaterThanOrEqual(22)
      expect(action.getAttribute('aria-label')).not.toBeNull()
    }
  })

  it('decodes all 100 embedded choices and keeps their picker inside a phone viewport', async () => {
    await page.viewport(390, 800)
    const style = document.createElement('style')
    style.textContent = `${CHATROOM_STYLES} body { margin:0; } .dsh-chatroom-avatar-grid { width: 350px; margin: 12px; }`
    document.head.append(style)
    document.body.innerHTML = `<div class="dsh-chatroom-avatar-grid">${CLASSIC_AVATAR_IMAGES.map(src => `<button class="dsh-chatroom-avatar-choice"><img src="${src}" alt="" /></button>`).join('')}</div>`
    await Promise.all([...document.images].map(image => image.decode()))
    expect([...document.images].every(image => image.naturalWidth > 0 && image.naturalHeight > 0)).toBe(true)
    const grid = document.querySelector<HTMLElement>('.dsh-chatroom-avatar-grid')!
    expect(grid.getBoundingClientRect().right).toBeLessThan(390)
    expect(grid.getBoundingClientRect().height).toBeLessThanOrEqual(254)
    expect(grid.scrollHeight).toBeGreaterThan(grid.clientHeight)
  })
})

function required<T extends Element = HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (element === null) throw new Error(`Missing fixture element: ${selector}`)
  return element
}
