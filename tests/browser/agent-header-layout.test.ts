import { afterEach, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { CHATROOM_STYLES } from '../../src/client/styles.js'

afterEach(async () => {
  await page.viewport(1280, 720)
  document.head.replaceChildren()
  document.body.replaceChildren()
})

function mountAgentHeader(): void {
  const style = document.createElement('style')
  style.textContent = `${CHATROOM_STYLES}
    body { margin: 0; }
    .dsh-chatroom-header-actions { width: 100%; }`
  document.head.append(style)
  document.body.innerHTML = `
    <span class="dsh-chatroom-header-actions">
      <span class="dsh-chatroom-identity-action">ZCode 验收员 · 1 人在线</span>
      <span class="dsh-chatroom-agent-roster" aria-label="房间 Agent">
        <span>Agent 3</span>
        <span class="dsh-chatroom-manage-action">DeepSeek · 主 Agent</span>
        <button class="dsh-chatroom-manage-action">Terra · 运行中</button>
        <button class="dsh-chatroom-manage-action">M3 · 可续聊</button>
        <button class="dsh-chatroom-manage-action" aria-label="刷新 Agent 列表">↻</button>
        <small>子 Agent 点按钮直接续聊；@ 会话引用不会唤起它。</small>
      </span>
      <button class="dsh-chatroom-manage-action">AI 成员</button>
      <button class="dsh-chatroom-manage-action">群管理</button>
    </span>`
}

describe('narrow-screen room agent header in a real browser', () => {
  it('keeps the agent roster on one horizontally scrollable row and hides the hint', async () => {
    await page.viewport(480, 800)
    mountAgentHeader()
    const header = document.querySelector<HTMLElement>('.dsh-chatroom-header-actions')!
    const roster = document.querySelector<HTMLElement>('.dsh-chatroom-agent-roster')!
    // The rc1.2 narrow layout forces a single non-wrapping, horizontally
    // scrollable row: flex nowrap mathematically prevents any second-line wrap,
    // and overflow-x keeps the overflow reachable instead of clipping it.
    expect(getComputedStyle(roster).flexWrap).toBe('nowrap')
    expect(getComputedStyle(roster).overflowX).toBe('auto')
    expect(roster.scrollWidth).toBeGreaterThanOrEqual(roster.clientWidth)
    // Content that no longer fits stays reachable through horizontal scrolling instead of clipping.
    expect(roster.scrollWidth).toBeGreaterThanOrEqual(roster.clientWidth)
    expect(getComputedStyle(roster).overflowX).toBe('auto')
    // The long hint text is hidden on narrow screens instead of pushing controls around.
    expect(getComputedStyle(roster.querySelector('small')!).display).toBe('none')
    // Every roster child keeps its natural width (flex 0 0 auto): nothing is squeezed into a sliver.
    for (const child of [...roster.children]) {
      if (getComputedStyle(child).display === 'none') continue
      expect(child.getBoundingClientRect().width).toBeGreaterThan(10)
    }
    expect(header.getBoundingClientRect().width).toBeLessThanOrEqual(481)
  })

  it('restores the wrapped wide layout once the viewport grows again', async () => {
    await page.viewport(1280, 720)
    mountAgentHeader()
    const roster = document.querySelector<HTMLElement>('.dsh-chatroom-agent-roster')!
    expect(getComputedStyle(roster.querySelector('small')!).display).not.toBe('none')
    expect(getComputedStyle(roster).flexWrap).toBe('wrap')
  })
})
