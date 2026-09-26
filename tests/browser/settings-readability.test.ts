import { afterEach, describe, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { ChatroomSettingsSection } from '../../src/client/ChatroomAccountPanels.js'
import { CHATROOM_STYLES } from '../../src/client/styles.js'
import { QQ2007_STYLES } from '../../src/client/qq2007-styles.js'
import type { ChatroomView } from '../../src/client/store.js'

let root: Root | undefined

afterEach(async () => {
  root?.unmount()
  root = undefined
  document.head.replaceChildren()
  document.body.replaceChildren()
  document.documentElement.removeAttribute('data-dsh-chatroom-style')
  await page.viewport(1280, 720)
})

function required<T extends HTMLElement = HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (element === null) throw new Error(`Missing ${selector}`)
  return element
}

function mountLegacySettings(): void {
  const style = document.createElement('style')
  style.textContent = `${CHATROOM_STYLES}
    body { margin: 0; font: 14px/1.5 system-ui, sans-serif; }
    .native-settings-shell { width: min(960px, 100%); margin: 20px auto; }
    [data-slot="settings.section"] { display: block; }
  `
  document.head.append(style)
  document.body.innerHTML = '<main class="native-settings-shell"><div data-slot="settings.section"></div></main>'
  const room = {
    phase: 'ready',
    // `ChatroomAuthService.state()` reports authenticated for legacy no-auth
    // sessions; it carries no account profile to render in Settings.
    auth: { enabled: false, authenticated: true, canManageSettings: true, providers: [], allowSelfRegistration: true, bootstrapRequired: false },
    manageableRooms: [{ id: 'legacy-room', title: 'Legacy room' }],
    agentProfilesRoomId: 'legacy-room',
    agentProfiles: { canManage: true, profiles: [], models: [{ provider: 'local', model: 'assistant', label: 'Local assistant', reasoningEfforts: [] }] },
    wecomAuthorization: { enabled: false, status: 'unauthorized' },
  } as unknown as ChatroomView
  const props = {
    useChatroom: (selector: (snapshot: ChatroomView) => unknown) => selector(room),
    closeAccount: vi.fn(), changePassword: vi.fn(async () => true), closeAdmin: vi.fn(), openAdmin: vi.fn(async () => undefined),
    adminCreateUser: vi.fn(async () => true), adminUpdateUser: vi.fn(async () => true), adminSetSelfRegistration: vi.fn(async () => true),
    adminSetAutoRedirectProvider: vi.fn(async () => true), adminSaveProvider: vi.fn(async () => true), adminDeleteProvider: vi.fn(async () => true),
    closeDirect: vi.fn(), sendDirect: vi.fn(async () => true), closeWecomAuthorization: vi.fn(),
  } as unknown as Parameters<typeof ChatroomSettingsSection>[0]
  root = createRoot(required('[data-slot="settings.section"]'))
  flushSync(() => root!.render(createElement(ChatroomSettingsSection, props)))
}

function mountAuthenticatedSettings(styleName: 'default' | 'qq2007' = 'default', emptyManageableRooms = false): void {
  const style = document.createElement('style')
  style.textContent = `${CHATROOM_STYLES}\n${styleName === 'qq2007' ? QQ2007_STYLES : ''}
    body { margin: 0; font: 14px/1.5 system-ui, sans-serif; }
    .native-settings-shell { width: min(960px, 100%); margin: 20px auto; }
    [data-slot="settings.section"] { display: block; }
  `
  document.head.append(style)
  if (styleName === 'qq2007') document.documentElement.dataset.dshChatroomStyle = 'qq2007'
  document.body.innerHTML = '<main class="native-settings-shell"><div data-slot="settings.section"></div></main>'
  const room = {
    phase: 'ready',
    auth: { enabled: true, authenticated: true, canManageSettings: true, providers: [], allowSelfRegistration: true, bootstrapRequired: false,
      account: { participantId: 'root', username: 'root', displayName: 'Root', avatarId: 'qq-1', role: 'super-admin', status: 'active', createdAt: 1 } },
    manageableRooms: emptyManageableRooms ? [] : [{ id: 'admin-room', title: 'Admin room' }],
    manageableRoomsStatus: 'ready',
    agentProfilesRoomId: 'admin-room',
    agentProfiles: { canManage: true, profiles: [], models: [{ provider: 'local', model: 'assistant', label: 'Local assistant', reasoningEfforts: [] }] },
    automationOverview: {
      canManage: true, provider: 'local', model: 'assistant', meetingSummaryProvider: 'local', meetingSummaryModel: 'assistant',
      mainAgentPrompt: 'main', controllerPrompt: 'controller',
      models: [{ provider: 'local', model: 'assistant', label: 'Local assistant', reasoningEfforts: [] }],
    },
    wecomAuthorization: { enabled: false, status: 'unauthorized' },
  } as unknown as ChatroomView
  const props = {
    useChatroom: (selector: (snapshot: ChatroomView) => unknown) => selector(room),
    closeAccount: vi.fn(), changePassword: vi.fn(async () => true), closeAdmin: vi.fn(), openAdmin: vi.fn(async () => undefined),
    adminCreateUser: vi.fn(async () => true), adminUpdateUser: vi.fn(async () => true), adminSetSelfRegistration: vi.fn(async () => true),
    adminSetAutoRedirectProvider: vi.fn(async () => true), adminSaveProvider: vi.fn(async () => true), adminDeleteProvider: vi.fn(async () => true),
    closeDirect: vi.fn(), sendDirect: vi.fn(async () => true), closeWecomAuthorization: vi.fn(),
  } as unknown as Parameters<typeof ChatroomSettingsSection>[0]
  root = createRoot(required('[data-slot="settings.section"]'))
  flushSync(() => root!.render(createElement(ChatroomSettingsSection, props)))
}

describe('readable plugin settings in a real browser', () => {
  it('does not spend a legacy settings column on an empty account card', async () => {
    await page.viewport(1200, 900)
    mountLegacySettings()

    const settings = required('.dsh-chatroom-settings')
    const agents = required('[data-testid="chatroom-settings-agents"]')
    expect(settings.querySelector('[aria-label="账号资料"]')).toBeNull()
    expect(agents.getBoundingClientRect().left).toBeCloseTo(settings.getBoundingClientRect().left, 0)
    expect(agents.getBoundingClientRect().right).toBeCloseTo(settings.getBoundingClientRect().right, 0)
  })

  it('keeps the AI enable switch a fixed, reachable control instead of stretching its rail', async () => {
    await page.viewport(1200, 900)
    mountAuthenticatedSettings()

    const form = required<HTMLFormElement>('.dsh-chatroom-agents-form')
    const toggle = required<HTMLElement>('.dsh-chatroom-agents-form .dsh-chatroom-switch')
    const track = required<HTMLElement>('.dsh-chatroom-agents-form .dsh-chatroom-switch > span')
    track.scrollIntoView({ block: 'center' })
    const formBox = form.getBoundingClientRect()
    const toggleBox = toggle.getBoundingClientRect()
    const trackBox = track.getBoundingClientRect()
    expect(toggleBox.width).toBeGreaterThanOrEqual(44)
    expect(toggleBox.height).toBeGreaterThanOrEqual(44)
    expect(trackBox.width).toBeCloseTo(38, 0)
    expect(trackBox.height).toBeCloseTo(22, 0)
    expect(toggleBox.width).toBeLessThan(formBox.width / 2)
    expect(document.elementFromPoint(trackBox.x + trackBox.width / 2, trackBox.y + trackBox.height / 2)).toBe(track)
  })

  it.each([
    ['default', 1200], ['qq2007', 1200], ['default', 390], ['qq2007', 320],
  ] as const)('keeps the empty manageable-room reload control reachable in %s at %ipx', async (styleName, width) => {
    await page.viewport(width, 900)
    mountAuthenticatedSettings(styleName, true)

    const reload = required<HTMLButtonElement>('button[aria-label="重新加载可管理群聊"]')
    reload.scrollIntoView({ block: 'center' })
    const box = reload.getBoundingClientRect()
    expect(box.width).toBeGreaterThanOrEqual(44)
    expect(box.height).toBeGreaterThanOrEqual(44)
    expect(box.left).toBeGreaterThanOrEqual(0)
    expect(box.right).toBeLessThanOrEqual(width)
    expect(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)).toBe(reload)
  })

  it.each(['default', 'qq2007'] as const)('shares an ordinary desktop settings card fairly between both automation models in %s', async styleName => {
    await page.viewport(1120, 800)
    mountAuthenticatedSettings(styleName)
    required<HTMLElement>('.native-settings-shell').style.width = '900px'

    const card = required<HTMLElement>('[aria-label="AI 自动响应设置"]')
    const selects = [...card.querySelectorAll<HTMLSelectElement>('select')]
    const buttons = [...card.querySelectorAll<HTMLButtonElement>('button')]
    const [judge, summary] = selects.map(select => select.getBoundingClientRect())
    expect(judge!.width).toBeGreaterThanOrEqual(160)
    expect(summary!.width).toBeGreaterThanOrEqual(160)
    expect(Math.abs(judge!.width - summary!.width)).toBeLessThanOrEqual(2)
    for (const button of buttons) {
      expect(getComputedStyle(button).whiteSpace).toBe('nowrap')
      expect(button.scrollWidth).toBeLessThanOrEqual(button.clientWidth)
    }
  })

  it.each(['default', 'qq2007'] as const)('stacks automation controls without horizontal overflow in a narrow %s settings pane', async styleName => {
    await page.viewport(320, 900)
    mountAuthenticatedSettings(styleName)

    const card = required<HTMLElement>('[aria-label="AI 自动响应设置"]')
    const form = required<HTMLElement>('.dsh-chatroom-automation-form')
    const children = [...form.querySelectorAll<HTMLElement>('label, button')]
    expect(getComputedStyle(form).gridTemplateColumns.split(' ')).toHaveLength(1)
    expect(form.scrollWidth).toBeLessThanOrEqual(form.clientWidth)
    expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth)
    for (const control of children) {
      const box = control.getBoundingClientRect()
      expect(box.left).toBeGreaterThanOrEqual(card.getBoundingClientRect().left)
      expect(box.right).toBeLessThanOrEqual(card.getBoundingClientRect().right)
    }
  })

  it.each([
    ['default', 1200, 14], ['qq2007', 1200, 14],
    ['default', 390, 16], ['qq2007', 390, 16],
  ] as const)('keeps %s plugin settings inputs readable at %ipx', async (styleName, width, minimumInputFont) => {
    await page.viewport(width, 900)
    mountAuthenticatedSettings(styleName)
    if (width === 390) expect(window.matchMedia('(max-width: 640px)').matches).toBe(true)

    const card = required<HTMLElement>('[data-testid="chatroom-settings-agents"]')
    const input = required<HTMLInputElement>('[aria-label="AI 成员名称"]')
    const label = input.closest<HTMLElement>('label')!
    expect(parseFloat(getComputedStyle(card).paddingLeft)).toBeGreaterThanOrEqual(14)
    expect(parseFloat(getComputedStyle(label).fontSize)).toBeGreaterThanOrEqual(14)
    const smallLabels = [...document.querySelectorAll<HTMLElement>('.dsh-chatroom-settings label')]
      .filter(item => item.querySelector('input:not([type="checkbox"]), select, textarea')
        && parseFloat(getComputedStyle(item).fontSize) < 14)
    expect(smallLabels.map(item => `${item.className || item.parentElement?.className}: ${getComputedStyle(item).fontSize}`)).toEqual([])
    const undersized = [...document.querySelectorAll<HTMLElement>(
      '.dsh-chatroom-settings :is(input:not([type="checkbox"]), select, textarea)',
    )].filter(control => parseFloat(getComputedStyle(control).fontSize) < minimumInputFont)
    expect(undersized.map(control => `${control.tagName}[${control.getAttribute('aria-label') ?? ''}]=${getComputedStyle(control).fontSize}`)).toEqual([])
  })
})
