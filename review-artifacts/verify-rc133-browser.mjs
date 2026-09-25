import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { assertExactReconnectChecks, finalizeAcceptance, nativeComposerActionSelector, observeDuringAction } from './acceptance-result.mjs'

// This is intentionally a read-only browser acceptance harness.  It never sends
// a room message, uploads a file, submits an AI/video/image request, or saves a
// server setting.  Browser-local style changes live only in this fresh context.
const here = dirname(fileURLToPath(import.meta.url))
const isolated = process.argv.includes('--isolated')
  || process.argv.includes('--isolated-nav-probe')
  || process.argv.includes('--isolated-asset-auth-probe')
const memberProbe = process.argv.includes('--member-probe')
const saViewportProbe = process.argv.includes('--sa-viewport-probe')
const saStyleDomProbe = process.argv.includes('--sa-style-dom-probe')
const saStyleToggleProbe = process.argv.includes('--sa-style-toggle-probe')
const saDeepLinkProbe = process.argv.includes('--sa-deep-link-probe')
const saContinuationProbe = process.argv.includes('--sa-continuation-probe')
const saFilesProbe = process.argv.includes('--sa-files-probe')
const saReconnectProbe = process.argv.includes('--sa-reconnect-probe')
const saExactReconnectProbe = process.argv.includes('--sa-exact-reconnect-probe')
const saNarrowProbe = process.argv.includes('--sa-narrow-probe')
const saFilesDialogsProbe = process.argv.includes('--sa-files-dialogs-probe')
const isolatedNavProbe = process.argv.includes('--isolated-nav-probe')
const isolatedAssetAuthProbe = process.argv.includes('--isolated-asset-auth-probe')
const version = process.env.RC_VERSION ?? '1.5.0-codex.rc1.33'
const release = `1${version.match(/rc1\.(\d+)$/u)?.[1] ?? 'unknown'}`
const receiptSuffix = process.env.RC_RECEIPT_SUFFIX ?? ''
assert.match(receiptSuffix, /^(?:|-[a-z0-9]+)$/u, 'RC_RECEIPT_SUFFIX must be empty or a simple -suffix')
const needsReconnectEvidence = Number(release) >= 134
const needsFilesComposerEvidence = Number(release) >= 139
const needsManageableRoomsStateEvidence = Number(release) >= 145
const publicReadyTimeoutMs = Number(process.env.RC_PUBLIC_READY_TIMEOUT_MS ?? 30_000)
assert.ok([30_000, 60_000].includes(publicReadyTimeoutMs))
const publicRole = process.env.RC_PUBLIC_ROLE
assert.ok(publicRole === undefined || ['member', 'super-admin'].includes(publicRole))
const prefix = '/plugins/deepseek-harness-chatroom/api'
const base = isolated ? 'http://127.0.0.1:3186' : 'https://talk.opcvip.net'
// This is the member account's already-authorized acceptance room.  It is
// deliberately not discovered by scanning rooms and never appears in receipts.
const memberAcceptanceRoomTitle = '权限与进展验收 20260912'
const withReceiptSuffix = name => name.replace(/(\.[^.]+)$/u, `${receiptSuffix}$1`)
const artifact = name => join(here, withReceiptSuffix(name))
const staticArtifact = name => join(here, name)
const receipt = {
  version,
  at: new Date().toISOString(),
  mode: isolated ? 'isolated-guest' : 'public-authenticated',
  base,
  roles: [],
  screenshots: [],
  ...(publicRole === undefined ? {} : { roleScope: publicRole }),
  passed: false,
}
const memberProbeReceipt = {
  version,
  at: new Date().toISOString(),
  mode: 'public-member-deep-link-probe',
  scope: ['fresh headless context', 'existing member account', 'read-only session and network observation', 'no message, input, upload, AI request, role change, or setting mutation'],
  passed: false,
}
const saViewportProbeReceipt = {
  version,
  at: new Date().toISOString(),
  mode: 'public-super-admin-768-style-probe',
  scope: ['fresh headless context', 'existing super-admin account', 'existing 全国可飞 room', 'read-only gallery navigation', 'browser-local style only', 'no message, input, upload, AI request, role change, or setting mutation'],
  passed: false,
}
const saStyleDomProbeReceipt = {
  version,
  at: new Date().toISOString(),
  mode: 'public-super-admin-768-style-dom-probe',
  scope: ['fresh headless context', 'existing super-admin account and room', 'deep-link selection', 'browser-local QQ style only', 'no gallery click, message, input, upload, AI request, role change, or setting mutation'],
  passed: false,
}
const saStyleToggleProbeReceipt = {
  version,
  at: new Date().toISOString(),
  mode: 'public-super-admin-768-bottom-panel-toggle-probe',
  scope: ['fresh headless context', 'existing super-admin account and room', 'deep-link selection', 'browser-local QQ style only', 'one reversible bottom-panel toggle open/close', 'no gallery click, message, input, upload, AI request, role change, or setting mutation'],
  passed: false,
}
const saDeepLinkProbeReceipt = {
  version,
  at: new Date().toISOString(),
  mode: 'public-super-admin-deep-link-probe',
  scope: ['fresh headless context', 'existing super-admin account and authorized room', 'deep-link and non-sensitive DOM/network observation only', 'no gallery click, message, input, upload, AI request, role change, or setting mutation'],
  passed: false,
}
const saContinuationProbeReceipt = {
  version,
  at: new Date().toISOString(),
  mode: 'public-super-admin-continuation',
  scope: ['fresh headless context', 'existing super-admin account and 全国可飞 room', 'read-only gallery and network observation', 'browser-local styles only', 'one UI reconnect', 'no message, input, upload, AI request, role change, or setting mutation'],
  passed: false,
}
const saFilesProbeReceipt = {
  version,
  at: new Date().toISOString(),
  mode: 'public-super-admin-files-slot-probe',
  scope: ['fresh headless context', 'existing super-admin account and 全国可飞 room', 'deep-link and non-sensitive native details-slot observation only', 'no click, gallery, message, input, upload, AI request, role change, or setting mutation'],
  passed: false,
}
const saReconnectProbeReceipt = {
  version,
  at: new Date().toISOString(),
  mode: 'public-super-admin-manual-reconnect-probe',
  scope: ['fresh headless context', 'existing super-admin account and 全国可飞 room', 'one UI reconnect after deep-link selection', 'network read observation', 'no message, input, upload, AI request, role change, server setting mutation, or page reload'],
  passed: false,
}
const saExactReconnectProbeReceipt = {
  version,
  at: new Date().toISOString(),
  mode: 'public-super-admin-exact-reconnect',
  scope: ['fresh headless context', 'one existing super-admin login', 'one authorized-room deep-link', 'open native Files only if the host entry is actually available', 'AI/group top-layer checks when Files opened', 'one UI reconnect after ready', 'no login retry, refresh, message, input, upload, AI request, role change, or server setting mutation'],
  passed: false,
}
const saNarrowProbeReceipt = {
  version,
  at: new Date().toISOString(),
  mode: 'public-super-admin-320-narrow-geometry-probe',
  scope: ['fresh headless context', 'one existing super-admin login', 'one authorized-room deep-link', 'browser-local QQ style only', 'contentless geometry/computed-style observation', 'no gallery, message, input, upload, AI request, role change, or setting mutation'],
  passed: false,
}
const saFilesDialogsProbeReceipt = {
  version,
  at: new Date().toISOString(),
  mode: 'public-super-admin-files-top-layer-probe',
  scope: ['fresh headless context', 'one existing super-admin login', 'one authorized-room deep-link', 'open existing native Files entry when operable', 'AI and group-management top-layer checks', 'no gallery, reconnect, message, input, upload, AI request, role change, or setting mutation'],
  passed: false,
}
const isolatedNavProbeReceipt = {
  version,
  at: new Date().toISOString(),
  mode: 'isolated-390-left-sidebar-hit-probe',
  scope: ['fresh headless context', 'guest identity only', 'read-only DOM geometry and hit-test', 'no message, input, upload, AI request, role change, or setting mutation'],
  passed: false,
}
const isolatedAssetAuthProbeReceipt = {
  version,
  at: new Date().toISOString(),
  mode: 'isolated-served-asset-and-auth-probe',
  scope: ['cold loopback Host', 'one test-guest identity bootstrap needed to mount Host plugin chrome', 'read-only manifest/client/session/manageable-room reads', 'no message, input, upload, AI request, role change, or setting mutation'],
  passed: false,
}
// Kept independently so a release verifier can examine the one manual
// reconnection assertion without reading credentials, room IDs, or transcript.
const reconnectionReceipt = {
  version,
  passed: false,
  scope: {
    actor: 'super-admin',
    action: 'one UI reconnect click after an already-open room is ready',
    excluded: ['message submission', 'composer input', 'upload', 'AI/provider request', 'server setting mutation', 'page reload'],
  },
  readbacks: {},
}

const redacted = error => String(error)
  .replace(/token=[^\s"']+/giu, 'token=[redacted]')
  .replace(/dsh_chatroom_auth=[^;\s"']+/giu, 'dsh_chatroom_auth=[redacted]')
  .replace(/(set-cookie\s*:\s*)[^\r\n]+/giu, '$1[redacted]')
  .replace(/(password|cookie|authorization)=[^\s"']+/giu, '$1=[redacted]')

// Failure evidence must be useful without retaining console payloads, user
// text, or long/signed URLs.  Keep only a small allowlist of error families.
const compactErrorFamily = value => {
  const text = String(value ?? '')
  if (/Maximum call stack(?: size)? exceeded/iu.test(text)) return 'Maximum call stack'
  if (/\bRangeError\b/u.test(text)) return 'RangeError'
  if (/\b(?:DSH|DeepSeek|SDK)[\w.-]*(?:Error|Exception)\b/iu.test(text)) return 'SDKError'
  return undefined
}

// Never persist arbitrary pageerror text: an exception can carry a room title,
// user input, or a signed URL.  The accepted error families remain actionable
// while unknown errors deliberately stay out of release evidence.
const recordCompactPageError = (errors, error) => {
  const family = compactErrorFamily(`${error.name}: ${error.message}`)
  if (family !== undefined && errors.length < 8) errors.push(family)
}

const compactRequestTiming = request => {
  const timing = request.timing()
  const milliseconds = value => Number.isFinite(value) && value >= 0 ? Math.round(value) : null
  // In Playwright, startTime is epoch-based while requestStart is relative to
  // that request. There is no separate public queue/blocked field, so retain
  // requestStart itself as the bounded observable—never subtract mixed clocks.
  const queueOrBlockedMs = milliseconds(timing.requestStart)
  return {
    queueOrBlockedMs,
    dnsMs: timing.domainLookupStart >= 0 && timing.domainLookupEnd >= 0 ? Math.round(timing.domainLookupEnd - timing.domainLookupStart) : null,
    connectMs: timing.connectStart >= 0 && timing.connectEnd >= 0 ? Math.round(timing.connectEnd - timing.connectStart) : null,
    requestMs: timing.requestStart >= 0 && timing.responseStart >= 0 ? Math.round(timing.responseStart - timing.requestStart) : null,
    downloadMs: timing.responseStart >= 0 && timing.responseEnd >= 0 ? Math.round(timing.responseEnd - timing.responseStart) : null,
    responseEndMs: milliseconds(timing.responseEnd),
  }
}

const save = async () => writeFile(
  artifact(isolated ? `RC${release}-isolated-browser.json` : `RC${release}-public-browser.json`),
  JSON.stringify(receipt, null, 2),
)
const saveReconnection = async () => writeFile(
  artifact(`RC${release}-CHATROOM-RECONNECTED.json`),
  JSON.stringify(reconnectionReceipt, null, 2),
)
const saveMemberProbe = async () => writeFile(
  artifact(`RC${release}-public-member-deep-link-probe.json`),
  JSON.stringify(memberProbeReceipt, null, 2),
)
const saveSaViewportProbe = async () => writeFile(
  artifact(`RC${release}-public-super-admin-768-style-probe.json`),
  JSON.stringify(saViewportProbeReceipt, null, 2),
)
const saveSaStyleDomProbe = async () => writeFile(
  artifact(`RC${release}-public-super-admin-768-style-dom-probe.json`),
  JSON.stringify(saStyleDomProbeReceipt, null, 2),
)
const saveSaStyleToggleProbe = async () => writeFile(
  artifact(`RC${release}-public-super-admin-768-bottom-panel-toggle-probe.json`),
  JSON.stringify(saStyleToggleProbeReceipt, null, 2),
)
const saveSaDeepLinkProbe = async () => writeFile(
  artifact(`RC${release}-public-super-admin-deep-link-probe.json`),
  JSON.stringify(saDeepLinkProbeReceipt, null, 2),
)
const saveSaContinuationProbe = async () => writeFile(
  artifact(`RC${release}-public-super-admin-continuation.json`),
  JSON.stringify(saContinuationProbeReceipt, null, 2),
)
const saveSaFilesProbe = async () => writeFile(
  artifact(`RC${release}-public-super-admin-files-slot-probe.json`),
  JSON.stringify(saFilesProbeReceipt, null, 2),
)
const saveSaReconnectProbe = async () => writeFile(
  artifact(`RC${release}-public-super-admin-manual-reconnect-probe.json`),
  JSON.stringify(saReconnectProbeReceipt, null, 2),
)
const saveSaExactReconnectProbe = async () => writeFile(
  artifact(`RC${release}-public-super-admin-exact-reconnect.json`),
  JSON.stringify(saExactReconnectProbeReceipt, null, 2),
)
const saveSaNarrowProbe = async () => writeFile(
  artifact(`RC${release}-public-super-admin-320-narrow-geometry-probe.json`),
  JSON.stringify(saNarrowProbeReceipt, null, 2),
)
const saveSaFilesDialogsProbe = async () => writeFile(
  artifact(`RC${release}-public-super-admin-files-top-layer-probe.json`),
  JSON.stringify(saFilesDialogsProbeReceipt, null, 2),
)
const saveIsolatedNavProbe = async () => writeFile(
  artifact(`RC${release}-isolated-390-sidebar-hit-probe.json`),
  JSON.stringify(isolatedNavProbeReceipt, null, 2),
)
const saveIsolatedAssetAuthProbe = async () => writeFile(
  artifact(`RC${release}-isolated-asset-auth-probe.json`),
  JSON.stringify(isolatedAssetAuthProbeReceipt, null, 2),
)

const screenshot = async (page, name, target) => {
  // Locator shots deliberately avoid capturing the room transcript/private text.
  const resolvedName = withReceiptSuffix(name.replace(/RC133/g, `RC${release}`))
  const file = staticArtifact(resolvedName)
  if (target) await target.screenshot({ path: file })
  else await page.screenshot({ path: file })
  receipt.screenshots.push(resolvedName)
}

const bounded = async (operation, label, timeout = 15_000) => {
  let timer
  try {
    return await Promise.race([
      operation,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeout}ms`)), timeout) }),
    ])
  } finally { clearTimeout(timer) }
}

// BrowserContext.request is a real Playwright APIRequestContext with its own
// dispose operation.  Closing the page/context alone can leave a pending
// request read alive long enough for browser.close() to block.  Dispose it
// first to cancel any such read, but still attempt context closure and surface
// either cleanup failure to the caller.
const closeBrowserContext = async (context, label) => {
  let requestDisposeError
  try {
    await bounded(context.request.dispose({ reason: 'acceptance harness context cleanup' }), `${label} API request dispose`, 10_000)
  } catch (error) { requestDisposeError = error }
  try {
    await bounded(context.close(), label)
  } catch (contextCloseError) {
    if (requestDisposeError !== undefined) throw new AggregateError([requestDisposeError, contextCloseError], `${label} and its API request cleanup failed`)
    throw contextCloseError
  }
  if (requestDisposeError !== undefined) throw requestDisposeError
}

const expectNoOverflow = async (page, viewport, label) => {
  await page.setViewportSize(viewport)
  const initial = await page.evaluate(() => ({ documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth }))
  // Host responsive layout is published by ResizeObserver. Measure its settled
  // render, while retaining the first frame rather than silently dropping it.
  await waitForAnimationFrames(page)
  await waitForNativeSidebarSettle(page, viewport.width)
  const geometry = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    bodyWidth: document.body.scrollWidth,
  }))
  assert.ok(geometry.documentWidth <= viewport.width, `${label}: horizontal document overflow ${geometry.documentWidth}/${viewport.width}`)
  assert.ok(geometry.bodyWidth <= viewport.width, `${label}: horizontal body overflow ${geometry.bodyWidth}/${viewport.width}`)
  return { ...viewport, initial, documentWidth: geometry.documentWidth, bodyWidth: geometry.bodyWidth }
}

const expectOperable = async (locator, label) => {
  await locator.waitFor({ state: 'visible', timeout: 15_000 })
  const proof = await locator.evaluate(element => {
    const box = element.getBoundingClientRect()
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight, hit: hit === element || element.contains(hit) }
  })
  assert.ok(proof.left >= 0 && proof.right <= proof.viewportWidth, `${label}: control is horizontally clipped`)
  assert.ok(proof.top >= 0 && proof.bottom <= proof.viewportHeight, `${label}: control is vertically clipped`)
  assert.ok(proof.width >= 24 && proof.height >= 24, `${label}: control target too small`)
  assert.ok(proof.hit, `${label}: control is covered`)
  return proof
}

const waitForVisible = async (locator, timeout = 30_000) => {
  // A cold overlay can mount its plugin action after the Host shell.  Retrying
  // the observation only does not create sessions, submit input, or reload.
  let lastError
  for (const wait of [15_000, timeout - 15_000]) {
    try {
      await locator.waitFor({ state: 'visible', timeout: wait })
      return
    } catch (error) { lastError = error }
  }
  throw lastError
}

const readDeepLinkSurface = async (page, expected) => page.evaluate(expected => {
  const status = document.querySelector('.dsh-chatroom-server-status')
  const tree = document.querySelector('[role="tree"]')
  const treeRect = tree?.getBoundingClientRect()
  return {
    documentTitlePresent: document.title.trim() !== '',
    urlHasDeepLink: new URL(location.href).searchParams.has('dsh-chatroom-room'),
    chatroomInstalled: document.documentElement.hasAttribute('data-dsh-chatroom-installed'),
    chatroomActive: document.documentElement.hasAttribute('data-dsh-chatroom-active'),
    documentDshAttributes: [...document.documentElement.attributes]
      .filter(attribute => attribute.name.startsWith('data-dsh-'))
      .map(attribute => ({ name: attribute.name, value: attribute.value.length <= 64 ? attribute.value : '[long]' })),
    loginFormVisible: document.querySelector('[aria-label="系统登录"]') !== null,
    identityFormVisible: document.querySelector('[data-testid="chatroom-identity-input"]') !== null,
    roomDirectoryVisible: document.querySelector('[data-testid="chatroom-room-list"]') !== null,
    alertVisible: document.querySelector('[role="alert"]') !== null,
    serverStatus: status === null ? { present: false } : {
      present: true,
      native: status.getAttribute('data-native'),
      room: status.getAttribute('data-room'),
      notifications: status.getAttribute('data-notifications'),
    },
    nativeTree: {
      present: tree !== null,
      visible: treeRect !== undefined && treeRect.width > 0 && treeRect.height > 0,
      selectedCount: document.querySelectorAll('div[role="treeitem"][aria-selected="true"]').length,
      selectedTarget: [...document.querySelectorAll('div[role="treeitem"][aria-selected="true"]')].some(node => (
        node.getAttribute('data-dsh-chatroom-session-id') === expected.sessionId
        && node.textContent?.includes(expected.title) === true
      )),
      selectedTitleMatchesTarget: [...document.querySelectorAll('div[role="treeitem"][aria-selected="true"]')]
        .some(node => node.textContent?.includes(expected.title) === true),
      selectedSessionAttributeMatchesTarget: [...document.querySelectorAll('div[role="treeitem"][aria-selected="true"]')]
        .some(node => node.getAttribute('data-dsh-chatroom-session-id') === expected.sessionId),
      selectedAttributeNames: [...document.querySelectorAll('div[role="treeitem"][aria-selected="true"]')]
        .flatMap(node => [...node.attributes].map(attribute => attribute.name))
        .filter((name, index, all) => all.indexOf(name) === index),
    },
  }
}, expected)

const openExistingRoom = async (page, room, row) => {
  // This plugin-owned URL contract selects the already-authorized Room without
  // depending on a cold native search-index read.
  const target = new URL(base)
  target.searchParams.set('dsh-chatroom-room', room.id)
  const selects = []
  const selectResponses = []
  const timeline = []
  const consoleErrors = []
  const pageErrors = []
  const startedAt = Date.now()
  const at = () => ({ atMs: Date.now() - startedAt, atUtc: new Date().toISOString() })
  const relevantPath = url => {
    const path = new URL(url).pathname
    return path.endsWith('/session/list') || path.endsWith('/rooms/select')
      || [prefix + '/session', prefix + '/notifications', prefix + '/events'].includes(path)
      ? path.replace(prefix, '') : undefined
  }
  const onRequest = request => {
    const path = relevantPath(request.url())
    if (path !== undefined) timeline.push({ ...at(), event: 'request', path, method: request.method() })
    if (path !== '/rooms/select') return
    // The receipt proves this browser attempted the requested room selection,
    // without retaining a room/session identifier from private test data.
    const payload = request.postDataJSON?.()
    selects.push({
      method: request.method(),
      requestedTarget: payload?.roomId === room.id,
    })
  }
  const onResponse = response => {
    const path = relevantPath(response.url())
    if (path !== undefined) timeline.push({ ...at(), event: 'response', path, status: response.status() })
    if (path !== '/rooms/select') return
    let requestedTarget = false
    try { requestedTarget = response.request().postDataJSON()?.roomId === room.id } catch {}
    selectResponses.push({ status: response.status(), requestedTarget })
  }
  const onRequestFinished = async request => {
    const path = relevantPath(request.url())
    if (path !== undefined) {
      const response = await request.response().catch(() => null)
      timeline.push({ ...at(), event: 'requestfinished', path, status: response?.status() ?? null, timing: compactRequestTiming(request) })
    }
  }
  const onRequestFailed = request => {
    const path = relevantPath(request.url())
    if (path !== undefined) timeline.push({
      ...at(), event: 'requestfailed', path,
      // Network engine error types are metadata, never request/response body.
      errorType: compactErrorFamily(request.failure()?.errorText) ?? 'network',
      timing: compactRequestTiming(request),
    })
  }
  const onConsole = message => {
    if (message.type() !== 'error') return
    const family = compactErrorFamily(message.text())
    if (family !== undefined && consoleErrors.length < 8) consoleErrors.push({ type: 'console-error', family })
  }
  const onPageError = error => {
    const family = compactErrorFamily(`${error.name}: ${error.message}`)
    if (family !== undefined && pageErrors.length < 8) pageErrors.push({ type: 'pageerror', family })
  }
  page.on('request', onRequest)
  page.on('response', onResponse)
  page.on('requestfinished', onRequestFinished)
  page.on('requestfailed', onRequestFailed)
  page.on('console', onConsole)
  page.on('pageerror', onPageError)
  try {
    await page.goto(target.toString(), { waitUntil: 'commit', timeout: 20_000 })
    const continueButton = page.getByRole('button', { name: '继续', exact: true })
    if (await continueButton.isVisible().catch(() => false)) await continueButton.click()
    // Account chrome may be intentionally collapsed at narrow widths.  The
    // navigation contract instead requires the actual native session and room
    // transport to be ready before judging the requested tree selection.
    await page.waitForFunction(() => {
      const status = document.querySelector('.dsh-chatroom-server-status')
      return status?.getAttribute('data-native') === 'connected'
        && status.getAttribute('data-room') === 'online'
    }, undefined, { timeout: isolated ? 30_000 : publicReadyTimeoutMs })
    // This is the Host's real navigation tree.  The chatroom-room test IDs
    // exist only in the plugin's directory dialog and are not evidence that a
    // native session was selected.
    await page.waitForFunction(expected => [...document.querySelectorAll('div[role="treeitem"][aria-selected="true"]')].some(row => (
      row.getAttribute('data-dsh-chatroom-session-id') === expected.sessionId
      && row.textContent?.includes(expected.title) === true
    )), { sessionId: String(room.sessionId), title: room.title }, { timeout: 30_000 })
    await page.getByRole('textbox', { name: /发消息或做任务/ }).waitFor({ timeout: 30_000 })
    const nativeSelected = await page.locator('div[role="treeitem"][aria-selected="true"]').evaluateAll((rows, expected) => rows.some(row => (
      row.getAttribute('data-dsh-chatroom-session-id') === expected.sessionId
      && row.textContent?.includes(expected.title) === true
    )), { sessionId: String(room.sessionId), title: room.title })
    assert.ok(selects.some(select => select.method === 'POST' && select.requestedTarget), 'deep-link did not issue rooms/select for the requested room')
    assert.ok(selectResponses.some(response => response.requestedTarget && response.status >= 200 && response.status < 300), 'deep-link requested-room rooms/select did not complete successfully')
    assert.ok(nativeSelected, 'deep-link did not select the expected native sidebar session')
    row.deepLink = {
      readinessDeadlineMs: isolated ? 30_000 : publicReadyTimeoutMs,
      requested: true,
      requestSent: selects.some(select => select.method === 'POST' && select.requestedTarget),
      selectResponseSucceeded: selectResponses.some(response => response.requestedTarget && response.status >= 200 && response.status < 300),
      active: await page.evaluate(() => document.documentElement.hasAttribute('data-dsh-chatroom-active')),
      nativeSelected,
      selectedNativeTitle: true,
      timeline,
    }
  } catch (error) {
    const tree = page.locator('[role="tree"]').first()
    if (await tree.isVisible().catch(() => false)) await screenshot(page, `RC133-public-${row.role}-deep-link-failure.png`, tree)
    row.deepLink = {
      requested: true,
      requestSent: selects.some(select => select.method === 'POST' && select.requestedTarget),
      active: await page.evaluate(() => document.documentElement.hasAttribute('data-dsh-chatroom-active')).catch(() => false),
      failure: redacted(error),
      surface: await readDeepLinkSurface(page, { sessionId: String(room.sessionId), title: room.title }).catch(() => ({ unreadable: true })),
      timeline,
      selectResponses,
      runtimeErrors: { console: consoleErrors, page: pageErrors },
    }
    throw error
  } finally {
    page.off('request', onRequest)
    page.off('response', onResponse)
    page.off('requestfinished', onRequestFinished)
    page.off('requestfailed', onRequestFailed)
    page.off('console', onConsole)
    page.off('pageerror', onPageError)
  }
}

const ensureTopLayerOverFiles = async (page, dialog, label) => {
  await dialog.waitFor({ timeout: 20_000 })
  const state = await dialog.evaluate(element => {
    const rect = element.getBoundingClientRect()
    const probe = document.elementFromPoint(rect.left + Math.min(24, rect.width / 2), rect.top + Math.min(24, rect.height / 2))
    return {
      modal: element.matches(':modal'),
      pointOwnedByDialog: probe === element || element.contains(probe),
      rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
    }
  })
  assert.ok(state.modal, `${label}: expected native top-layer dialog`)
  assert.ok(state.pointOwnedByDialog, `${label}: top-layer dialog is obscured`)
  return state
}

const openNativeFiles = async page => {
  // Files belongs to the Host workbench right-pane, not necessarily the old
  // `details` slot. Locate its real existing tab/button by visible semantics
  // and right-side geometry; never create a fixture or assume a panel class.
  const findFiles = async requireViewport => page.locator('button, [role="tab"], [title="Files"]').evaluateAll((nodes, requireViewport) => {
    const candidates = nodes.filter(node => {
      const rect = node.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
        && (node.textContent?.trim() === 'Files' || node.getAttribute('title') === 'Files')
        && rect.left + rect.width / 2 >= innerWidth / 2
        && (!requireViewport || (rect.left >= 0 && rect.right <= innerWidth))
    })
    const chosen = candidates[0]
    return chosen === undefined ? -1 : nodes.indexOf(chosen)
  }, requireViewport)
  const controls = page.locator('button, [role="tab"], [title="Files"]')
  const offscreenFilesIndex = await findFiles(false)
  let filesIndex = await findFiles(true)
  if (filesIndex < 0) {
    const sidebarToggles = page.locator('button[aria-label="展开侧边栏"], button[aria-label="打开侧边栏"]')
    const rightToggleIndex = await sidebarToggles.evaluateAll(buttons => buttons.findIndex(button => {
      const rect = button.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0 && rect.left + rect.width / 2 >= innerWidth / 2
        && !button.closest('[data-slot="sidebar"]')
    }))
    if (rightToggleIndex >= 0) {
      const sidebarToggle = sidebarToggles.nth(rightToggleIndex)
      await expectOperable(sidebarToggle, 'native Files/workbench toggle')
      await sidebarToggle.click()
      await page.waitForTimeout(100)
      filesIndex = await findFiles(true)
    }
  }
  assert.ok(filesIndex >= 0, offscreenFilesIndex >= 0
    ? 'real native workbench Files entry exists but remains outside the viewport after the real sidebar toggle check'
    : 'real native workbench Files tab/button is unavailable')
  const files = controls.nth(filesIndex)
  await expectOperable(files, 'native workbench Files tab/button')
  await files.click()
  const state = await files.evaluate(element => {
    const panel = element.closest('[data-dsh-panel="true"]')
      ?? [...document.querySelectorAll('[data-dsh-panel="true"]')].find(node => {
        const rect = node.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0 && rect.left + rect.width / 2 >= innerWidth / 2
      })
      ?? null
    const rect = panel?.getBoundingClientRect()
    return {
      controlRole: element.getAttribute('role') ?? element.tagName.toLowerCase(),
      controlAriaSelected: element.getAttribute('aria-selected'),
      panelContract: panel?.getAttribute('data-dsh-panel') ?? null,
      panelVisible: rect !== undefined && rect.width > 0 && rect.height > 0,
    }
  })
  assert.equal(state.panelVisible, true, 'native Files workbench panel is not visible after opening its existing control')
  return { nativeSlot: 'workbench-right-pane', openedExistingFilesEntry: true, ...state }
}

// RC139 checks the actual native composer controls—rather than treating the
// whole Files/details layout as an overlap bug. These are the stable Host slots
// exercised by the UI fixture: model button, context output, and send button.
const ensureNativeComposerControlGeometry = async (page, label, measured = () => {}) => {
  const state = await page.evaluate(actionSelector => {
    const inputRight = document.querySelector('[data-slot="conversation.input.right"]')
    const trailing = inputRight?.parentElement ?? null
    const model = trailing?.querySelector('[data-slot="conversation.input.model"] button') ?? null
    const context = trailing?.querySelector('button[aria-haspopup="dialog"][aria-label*="上下文"], button[aria-haspopup="dialog"][aria-label*="context"]') ?? null
    const actions = [...(trailing?.querySelectorAll(actionSelector) ?? [])]
    const send = actions.at(-1) ?? null
    const rect = element => {
      if (element === null) return null
      const box = element.getBoundingClientRect()
      const center = { x: box.left + box.width / 2, y: box.top + box.height / 2 }
      const hit = document.elementFromPoint(center.x, center.y)
      return {
        left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height,
        hit: hit === element || element.contains(hit),
        hitElement: hit === null ? null : { tag: hit.tagName, className: typeof hit.className === 'string' ? hit.className : null, slot: hit.closest('[data-slot]')?.getAttribute('data-slot') },
      }
    }
    const controls = { model: rect(model), context: rect(context), send: rect(send) }
    const overlaps = (left, right) => left !== null && right !== null
      && Math.min(left.right, right.right) - Math.max(left.left, right.left) > 0
      && Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top) > 0
    return {
      trailing: rect(trailing),
      buttonShapes: [...(trailing?.querySelectorAll('button') ?? [])].map(button => ({
        label: button.getAttribute('aria-label'), type: button.getAttribute('type'),
        disabled: button.disabled, slot: button.closest('[data-slot]')?.getAttribute('data-slot'),
        rect: rect(button),
      })),
      controls,
      primaryActions: actions.map(rect),
      overlaps: {
        modelContext: overlaps(controls.model, controls.context),
        modelSend: overlaps(controls.model, controls.send),
        contextSend: overlaps(controls.context, controls.send),
      },
    }
  }, nativeComposerActionSelector)
  measured(state)
  for (const [name, control] of Object.entries(state.controls)) {
    assert.ok(control !== null && control.width >= 24 && control.height >= 24, `${label}: ${name} control missing or too small`)
    assert.ok(control.hit, `${label}: ${name} control is covered`)
  }
  assert.equal(state.overlaps.modelContext, false, `${label}: model selection overlaps context`)
  assert.equal(state.overlaps.modelSend, false, `${label}: model selection overlaps send`)
  assert.equal(state.overlaps.contextSend, false, `${label}: context overlaps send`)
  for (const [index, action] of state.primaryActions.entries()) {
    assert.ok(action.width >= 24 && action.height >= 24 && action.hit, `${label}: primary action ${index} is too small or covered`)
    for (const peer of [state.controls.model, state.controls.context, ...state.primaryActions.slice(index + 1)]) {
      assert.ok(peer === null || Math.min(action.right, peer.right) <= Math.max(action.left, peer.left)
        || Math.min(action.bottom, peer.bottom) <= Math.max(action.top, peer.top), `${label}: primary action ${index} overlaps another control`)
    }
  }
  return state
}

const findLeftNativeSidebarToggle = async page => {
  const toggles = page.locator('button[aria-label="展开侧边栏"], button[aria-label="打开侧边栏"]')
  const result = await toggles.evaluateAll(buttons => {
    const visible = button => {
      const rect = button.getBoundingClientRect()
      const style = getComputedStyle(button)
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
    }
    // The right workbench owns a separate sidebar toggle.  It is not always
    // in the legacy `details` slot, so exclude its real panel contract too.
    // The Host's native left rail is fixed at the outer edge: limiting the
    // centre to 160px (and the left third on narrow windows) identifies it
    // without relying on DOM mutation or on the first matching button.
    const candidates = buttons
      .map((button, index) => {
        const rect = button.getBoundingClientRect()
        return {
          index,
          ariaLabel: button.getAttribute('aria-label'),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          inDetails: button.closest('[data-slot="details"]') !== null,
          inWorkbenchPanel: button.closest('[data-dsh-panel="true"]') !== null,
          visible: visible(button),
        }
      })
      .filter(button => button.visible
        && !button.inDetails
        && !button.inWorkbenchPanel
        && button.left + button.width / 2 <= Math.min(160, innerWidth / 3))
    return { indexes: candidates.map(button => button.index), candidates }
  })
  assert.ok(result.indexes.length <= 1, `left native sidebar expand control must resolve to at most one real left-rail toggle: ${JSON.stringify(result.candidates)}`)
  // No visible "open/expand sidebar" control is the Host's observable
  // expanded state.  Do not infer it from the sidebar wrapper width: that
  // wrapper includes fixed rail/border layout and can exceed 56px collapsed.
  return result.indexes.length === 0 ? null : toggles.nth(result.indexes[0])
}

const waitForAnimationFrames = async page => page.evaluate(() => new Promise(resolve => {
  requestAnimationFrame(() => requestAnimationFrame(resolve))
}))

const expandLeftNativeSidebar = async page => {
  const sidebar = page.locator('[data-slot="sidebar"]').first()
  await sidebar.waitFor({ state: 'visible', timeout: 15_000 })
  const viewportWidth = await page.evaluate(() => innerWidth)
  // A Host ResizeObserver can publish an old wide-sidebar measurement in the
  // same turn as a viewport resize.  Wait for two stable snapshots and two
  // rendered frames before deciding that the left rail needs a real click.
  await waitForNativeSidebarSettle(page, viewportWidth)
  await waitForAnimationFrames(page)
  await waitForNativeSidebarSettle(page, viewportWidth)
  const toggle = await findLeftNativeSidebarToggle(page)
  if (toggle !== null) {
    await expectOperable(toggle, 'left native sidebar expand toggle')
    await toggle.click()
    await page.waitForFunction(() => {
      const visible = button => {
        const rect = button.getBoundingClientRect()
        const style = getComputedStyle(button)
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
      }
      const leftOpenControls = [...document.querySelectorAll('button[aria-label="展开侧边栏"], button[aria-label="打开侧边栏"]')]
        .filter(button => {
          const rect = button.getBoundingClientRect()
          return visible(button)
            && button.closest('[data-slot="details"]') === null
            && button.closest('[data-dsh-panel="true"]') === null
            && rect.left + rect.width / 2 <= Math.min(160, innerWidth / 3)
        })
      return leftOpenControls.length === 0
    }, undefined, { timeout: 15_000 })
    await waitForAnimationFrames(page)
    await waitForNativeSidebarSettle(page, viewportWidth)
  }
  return sidebar
}

const checkExpandedSidebarOverflow = async page => {
  const wasCollapsed = await findLeftNativeSidebarToggle(page) !== null
  const sidebar = await expandLeftNativeSidebar(page)
  try {
  const state = await sidebar.evaluate(element => {
    const categories = element.querySelector('[data-dsh-chatroom-workspace-categories]')
    const rect = node => {
      const box = node.getBoundingClientRect()
      return { left: box.left, right: box.right, width: box.width, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth }
    }
    return { sidebar: rect(element), categories: categories === null ? null : rect(categories) }
  })
  assert.ok(state.categories !== null && state.categories.width > 0, 'expanded native sidebar lacks chatroom workspace categories')
  assert.ok(state.categories.scrollWidth <= state.categories.clientWidth + 1, 'expanded native sidebar category list has horizontal overflow')
  return state
  } finally {
    if (wasCollapsed) {
      const close = sidebar.getByRole('button', { name: /^(收起侧边栏|Collapse sidebar)$/u })
      await expectOperable(close, 'restore left native sidebar')
      await close.click({ timeout: 10_000 })
      await waitForAnimationFrames(page)
      await waitForNativeSidebarSettle(page, await page.evaluate(() => innerWidth))
      // Host geometry can settle before its fading controls and aria labels
      // finish updating. Observe the real expected control, bounded; do not
      // infer interaction failure from the first animation frame.
      const deadline = Date.now() + 5_000
      let restored
      do {
        restored = await findLeftNativeSidebarToggle(page)
        if (restored !== null) break
        await page.waitForTimeout(100)
      } while (Date.now() < deadline)
      assert.ok(restored, 'narrow sidebar did not restore its initial collapsed state within5s')
    }
  }
}

const checkGallery = async (page, row, screenshotName, expectedRoom) => {
  let dialogOwnedInflight = 0
  let dialogOwnedStartedAfterCloseInitiated = 0
  let dialogOwnedStartedAfterHidden = 0
  let closeInitiated = false
  let hidden = false
  const galleryResponses = []
  const pendingDialogOwned = new Map()
  const selectedOriginalUrls = new Set()
  const metadataOriginalUrls = new Set()
  const excluded = { nativeThumbnails: 0, otherMedia: 0, unrelatedMetadata: 0 }
  const route = url => {
    const path = url.pathname
    if (path.endsWith('/media/gallery')) return '/media/gallery'
    if (path.startsWith(`${prefix}/images/`)) return '/images/:source'
    if (path.startsWith(`${prefix}/files/`)) return '/files/:id'
    if (path.startsWith(`${prefix}/media/`)) return '/media/:endpoint'
    return null
  }
  const canonicalUrl = raw => {
    const url = new URL(raw, base)
    url.hash = ''
    return url.toString()
  }
  const originalFromThumbnail = raw => {
    const url = new URL(raw, base)
    url.searchParams.delete('preview')
    url.hash = ''
    return url.toString()
  }
  // Only the target room's metadata and URLs explicitly selected from its
  // tiles are dialog-owned.  Other plugin media can be a Host preview, a
  // thumbnail, or video work, so it is counted as excluded rather than turned
  // into a false close-leak failure.
  const classify = request => {
    const url = new URL(request.url())
    const pathRoute = route(url)
    if (pathRoute === null) return { owned: false, kind: 'outside-gallery-scope', route: null }
    if (pathRoute === '/media/gallery') {
      const target = url.searchParams.get('roomId') === expectedRoom.id
        && url.searchParams.get('sessionId') === String(expectedRoom.sessionId)
      return { owned: target, kind: target ? 'gallery-metadata' : 'unrelated-metadata', route: pathRoute }
    }
    if (selectedOriginalUrls.has(canonicalUrl(url))) return { owned: true, kind: 'selected-original-fetch', route: pathRoute }
    return { owned: false, kind: request.resourceType() === 'image' ? 'native-thumbnail-or-preview' : 'other-media-or-file', route: pathRoute }
  }
  const onRequest = request => {
    const classification = classify(request)
    if (classification.route === null) return
    if (!classification.owned) {
      if (classification.kind === 'native-thumbnail-or-preview') excluded.nativeThumbnails += 1
      else if (classification.kind === 'unrelated-metadata') excluded.unrelatedMetadata += 1
      else excluded.otherMedia += 1
      return
    }
    dialogOwnedInflight += 1
    pendingDialogOwned.set(request, { route: classification.route, kind: classification.kind })
    if (closeInitiated) dialogOwnedStartedAfterCloseInitiated += 1
    if (hidden) dialogOwnedStartedAfterHidden += 1
  }
  const onSettled = request => {
    if (!pendingDialogOwned.has(request)) return
    dialogOwnedInflight = Math.max(0, dialogOwnedInflight - 1)
    pendingDialogOwned.delete(request)
  }
  const onResponse = response => {
    const url = new URL(response.url())
    const classification = classify(response.request())
    if (classification.route !== null) galleryResponses.push({
      route: classification.route, status: response.status(), kind: classification.kind, owned: classification.owned,
      ...(classification.route === '/media/gallery' ? { expectedRoom: url.searchParams.get('roomId') === expectedRoom.id, expectedSession: url.searchParams.get('sessionId') === String(expectedRoom.sessionId) } : {}),
    })
  }
  page.on('request', onRequest)
  page.on('requestfinished', onSettled)
  page.on('requestfailed', onSettled)
  page.on('response', onResponse)
  try {
    // Register before clicking; a fast gallery response must not turn into an
    // acceptance-harness race.  It is also exact evidence of deep-link target.
    await page.bringToFront()
    await page.waitForFunction(() => document.visibilityState === 'visible')
    const response = await observeDuringAction(() => page.waitForResponse(response => {
      const url = new URL(response.url())
      return url.pathname.endsWith('/media/gallery')
        && url.searchParams.get('roomId') === expectedRoom.id
        && url.searchParams.get('sessionId') === String(expectedRoom.sessionId)
    }, { timeout: 15_000 }), () => page.getByRole('button', { name: '▧ 会话图库', exact: true }).click())
    const dialog = page.getByRole('dialog', { name: '会话图片图库', exact: true })
    await dialog.waitFor({ timeout: 30_000 })
    assert.equal(response.status(), 200, 'selected-room gallery read must succeed')
    const metadata = await response.json()
    assert.ok(Array.isArray(metadata.items), 'selected-room gallery metadata must contain items')
    for (const item of metadata.items) if (typeof item?.url === 'string') metadataOriginalUrls.add(canonicalUrl(item.url))
    await screenshot(page, screenshotName, dialog)
    const matchedTarget = galleryResponses.some(item => item.route === '/media/gallery' && item.expectedRoom && item.expectedSession)
    row.deepLink.galleryRequestMatchedTarget = matchedTarget
    assert.ok(matchedTarget, 'deep-link did not select the requested room before gallery read')
    const thumbnails = dialog.getByRole('button', { name: /打开第 \d+ 张图片/u })
    await thumbnails.first().waitFor({ timeout: 30_000 })
    const count = await thumbnails.count()
    assert.ok(count >= 2, 'media acceptance room must expose at least two gallery thumbnails for previous/next verification')
    const tileOriginalUrls = await thumbnails.evaluateAll(buttons => buttons.map(button => {
      const image = button.querySelector('img')
      return image === null ? null : image.currentSrc || image.src
    }))
    assert.ok(typeof tileOriginalUrls[0] === 'string', 'gallery tile must use a native thumbnail image')
    const firstOriginalUrl = originalFromThumbnail(tileOriginalUrls[0])
    assert.ok(metadataOriginalUrls.has(firstOriginalUrl), 'clicked gallery tile must refer to selected-room metadata')
    selectedOriginalUrls.add(firstOriginalUrl)
    await thumbnails.first().click()
    const original = dialog.locator('.dsh-chatroom-gallery-stage img')
    await original.waitFor({ timeout: 30_000 })
    const dimensions = await original.evaluate(image => ({ naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight }))
    assert.ok(dimensions.naturalWidth > 0 && dimensions.naturalHeight > 0, 'gallery original must decode before navigation')
    const next = dialog.getByRole('button', { name: '下一张 →', exact: true })
    const previous = dialog.getByRole('button', { name: '← 上一张', exact: true })
    assert.equal(await next.isEnabled(), true, 'gallery next control')
    assert.equal(await previous.isEnabled(), true, 'gallery previous control')
    const before = await dialog.locator('.dsh-chatroom-gallery-navigation span').innerText()
    if (typeof tileOriginalUrls[1] === 'string') selectedOriginalUrls.add(originalFromThumbnail(tileOriginalUrls[1]))
    await next.click()
    await page.waitForFunction(previousValue => document.querySelector('.dsh-chatroom-gallery-navigation span')?.textContent !== previousValue, before)
    await previous.click()
    closeInitiated = true
    await dialog.getByRole('button', { name: '关闭大图', exact: true }).click()
    await dialog.waitFor({ state: 'hidden', timeout: 10_000 })
    hidden = true
    await page.waitForTimeout(1_000)
    assert.equal(dialogOwnedInflight, 0, 'dialog-owned gallery reads must settle after close')
    assert.equal(dialogOwnedStartedAfterCloseInitiated, 0, 'dialog-owned gallery reads must not begin after close is initiated')
    assert.equal(dialogOwnedStartedAfterHidden, 0, 'dialog-owned gallery reads must not begin after the dialog is hidden')
    row.gallery = {
      thumbnails: count, original: dimensions, previousNext: true, closed: true,
      metadata: { targetRoomSession: true, itemUrls: metadataOriginalUrls.size },
      selectedOriginalUrls: selectedOriginalUrls.size,
      nativeTileImages: true,
      dialogOwnedInflightAfterClose: dialogOwnedInflight,
      dialogOwnedStartedAfterCloseInitiated,
      dialogOwnedStartedAfterHidden,
      excluded,
    }
  } catch (error) {
    const dialog = page.getByRole('dialog', { name: '会话图片图库', exact: true })
    if (await dialog.isVisible().catch(() => false)) await screenshot(page, screenshotName.replace(/\.png$/u, '-failure.png'), dialog)
    row.gallery = {
      failed: true, responses: galleryResponses, pendingDialogOwnedReads: [...pendingDialogOwned.values()],
      selectedOriginalUrls: selectedOriginalUrls.size, metadataItemUrls: metadataOriginalUrls.size,
      closeInitiated, hidden, excluded, error: redacted(error),
    }
    throw error
  } finally {
    page.off('request', onRequest)
    page.off('requestfinished', onSettled)
    page.off('requestfailed', onSettled)
    page.off('response', onResponse)
  }
}

const checkEmptyGallery = async (page, row, screenshotName, expectedRoom) => {
  const responses = []
  const onResponse = response => {
    const url = new URL(response.url())
    if (url.pathname.endsWith('/media/gallery')) responses.push({
      status: response.status(),
      expectedRoom: url.searchParams.get('roomId') === expectedRoom.id,
      expectedSession: url.searchParams.get('sessionId') === String(expectedRoom.sessionId),
    })
  }
  page.on('response', onResponse)
  try {
    const response = await observeDuringAction(() => page.waitForResponse(response => {
      const url = new URL(response.url())
      return url.pathname.endsWith('/media/gallery')
        && url.searchParams.get('roomId') === expectedRoom.id
        && url.searchParams.get('sessionId') === String(expectedRoom.sessionId)
    }, { timeout: 15_000 }), () => page.getByRole('button', { name: '▧ 会话图库', exact: true }).click())
    const dialog = page.getByRole('dialog', { name: '会话图片图库', exact: true })
    await dialog.waitFor({ timeout: 30_000 })
    assert.equal(response.status(), 200, 'member selected-room gallery read must succeed')
    await screenshot(page, screenshotName, dialog)
    assert.ok(responses.some(response => response.status === 200 && response.expectedRoom && response.expectedSession), 'member gallery read did not address the selected owned room')
    assert.equal(await dialog.getByRole('button', { name: /打开第 \d+ 张图片/u }).count(), 0, 'member empty-gallery path must not claim a multi-image pass')
    await dialog.getByText('本会话暂无图片', { exact: true }).waitFor({ timeout: 10_000 })
    assert.equal(await dialog.getByRole('alert').count(), 0, 'member gallery empty state must not be a read error')
    await dialog.getByRole('button', { name: '关闭大图', exact: true }).click()
    await dialog.waitFor({ state: 'hidden', timeout: 10_000 })
    row.gallery = { kind: 'empty-owned-room', multiImagePass: false, normalEmptyState: true, responses }
  } catch (error) {
    const dialog = page.getByRole('dialog', { name: '会话图片图库', exact: true })
    if (await dialog.isVisible().catch(() => false)) await screenshot(page, screenshotName.replace(/\.png$/u, '-failure.png'), dialog)
    row.gallery = { kind: 'empty-owned-room', multiImagePass: false, failed: true, responses, error: redacted(error) }
    throw error
  } finally { page.off('response', onResponse) }
}

const candidateClientAsset = async () => {
  const profile = process.env.DSH_CHATROOM_TEST_PROFILE ?? 'C:/Users/datoo/.dsh/chatroom-next-test/profiles/web'
  const path = isolated
    ? `${profile}/plugin-releases/chatroom-${version}/dist/client.js`
    : join(here, '..', 'dist', 'client.js')
  const bytes = await readFile(path)
  return { bytes, sha256: createHash('sha256').update(bytes).digest('hex') }
}

// The fixed DSH Host wraps a plugin asset by injecting one terminal semicolon
// before rewriting its terminal source-map URL to a revisioned plugin route.
// This normalization is intentionally narrow and deterministic: normalize
// line endings, remove only that terminal `;` plus sourceMappingURL wrapper,
// then SHA-256 the complete remaining payload.  It never accepts a marker or
// a partial text match.
const normalizedClientPayload = bytes => Buffer.from(bytes.toString('utf8')
  .replace(/\r\n/gu, '\n')
  .replace(/(?:\n;\n|\n)\/\/# sourceMappingURL=[^\r\n]*[\r\n]*$/u, ''), 'utf8')

const boundedAssetDifference = (served, candidate) => {
  const limit = Math.min(served.length, candidate.length)
  let firstDifference = 0
  while (firstDifference < limit && served[firstDifference] === candidate[firstDifference]) firstDifference += 1
  let commonSuffixBytes = 0
  while (commonSuffixBytes < limit - firstDifference
    && served[served.length - 1 - commonSuffixBytes] === candidate[candidate.length - 1 - commonSuffixBytes]) commonSuffixBytes += 1
  const footerKind = bytes => {
    const tail = bytes.subarray(Math.max(0, bytes.length - 512)).toString('utf8')
    if (/\/\/# sourceMappingURL=/u.test(tail)) return 'line-source-map'
    if (/\/\*# sourceMappingURL=[\s\S]*?\*\/$/u.test(tail)) return 'block-source-map'
    return 'none-or-nonstandard'
  }
  return { firstDifference, commonSuffixBytes, lengthDelta: served.length - candidate.length, servedFooterKind: footerKind(served), candidateFooterKind: footerKind(candidate) }
}

const readServedClientAsset = async (page, context, { captureName } = {}) => {
  const html = await page.content()
  const clientPath = html.match(/"id"\s*:\s*"deepseek-harness-chatroom"\s*,\s*"url"\s*:\s*"([^"]+)"/u)?.[1]
    ?? html.match(/"url"\s*:\s*"([^"]+)"\s*,\s*"id"\s*:\s*"deepseek-harness-chatroom"/u)?.[1]
    // DSH may flatten a plugin asset into a loader wrapper instead of retaining
    // the manifest object.  This fallback still selects the exact plugin
    // client asset, never a marker-bearing unrelated bundle.
    ?? html.match(/(\/plugins\/[^"'\s<]*deepseek-harness-chatroom\/client\.js[^"'\s<]*)/u)?.[1]
  assert.ok(clientPath, 'served page must retain the chatroom client manifest')
  const client = await context.request.get(new URL(clientPath, base).toString(), { timeout: 20_000 })
  assert.equal(client.status(), 200, 'served chatroom client')
  const served = await client.body()
  // Asset bytes are public plugin code, not API data.  A diagnostic capture is
  // opt-in and restricted to the isolated test profile so a verifier can make
  // a complete offline comparison without persisting URLs, cookies, or user
  // content.
  if (captureName !== undefined) await writeFile(staticArtifact(captureName), served)
  const candidate = await candidateClientAsset()
  const direct = served.equals(candidate.bytes)
  const embeddedAt = direct ? 0 : served.indexOf(candidate.bytes)
  const servedNormalized = normalizedClientPayload(served)
  const candidateNormalized = normalizedClientPayload(candidate.bytes)
  const normalizedPayload = servedNormalized.equals(candidateNormalized)
  // Some DSH versions wrap the plugin client in a deterministic aggregator.
  // Treat that only as valid when its exact candidate bytes occur verbatim;
  // matching a legacy UI marker alone is deliberately insufficient.
  // Keep the candidate/served evidence even for a mismatch.  The normal
  // assertion remains strict, but the isolated asset probe can now distinguish
  // a Host wrapper transformation from a stale/incorrect entrypoint without
  // storing the asset URL or bundle body.
  const exactCandidate = direct || embeddedAt >= 0 || normalizedPayload
  const result = {
    manifest: true,
    status: 200,
    servedSha256: createHash('sha256').update(served).digest('hex'),
    candidateSha256: candidate.sha256,
    servedBytes: served.length,
    candidateBytes: candidate.bytes.length,
    exactCandidate,
    normalizedPayload,
    normalization: 'terminal-semicolon-and-source-map-footer-v1',
    servedNormalizedSha256: createHash('sha256').update(servedNormalized).digest('hex'),
    candidateNormalizedSha256: createHash('sha256').update(candidateNormalized).digest('hex'),
    servedSourceMapFooter: /\/\/# sourceMappingURL=[^\r\n]*[\r\n]*$/u.test(served.toString('utf8')),
    candidateSourceMapFooter: /\/\/# sourceMappingURL=[^\r\n]*[\r\n]*$/u.test(candidate.bytes.toString('utf8')),
    difference: boundedAssetDifference(served, candidate.bytes),
    structure: direct
      ? 'direct'
      : embeddedAt >= 0
        ? 'wrapper-contains-exact-candidate'
        : normalizedPayload
          ? 'host-terminal-source-map-wrapper-normalized'
          : 'not-exact-candidate',
  }
  if (!exactCandidate) return result
  const code = served.toString('utf8')
  return result
}

const checkServedClientBuild = async (page, context, row) => {
  const served = await readServedClientAsset(page, context)
  assert.ok(served.exactCandidate, 'served client does not contain the exact immutable candidate asset')
  const html = await page.content()
  const clientPath = html.match(/"id"\s*:\s*"deepseek-harness-chatroom"\s*,\s*"url"\s*:\s*"([^"]+)"/u)?.[1]
    ?? html.match(/"url"\s*:\s*"([^"]+)"\s*,\s*"id"\s*:\s*"deepseek-harness-chatroom"/u)?.[1]
    ?? html.match(/(\/plugins\/[^"'\s<]*deepseek-harness-chatroom\/client\.js[^"'\s<]*)/u)?.[1]
  assert.ok(clientPath, 'served page must retain the chatroom client manifest')
  const client = await context.request.get(new URL(clientPath, base).toString(), { timeout: 20_000 })
  assert.equal(client.status(), 200, 'served chatroom client')
  const code = await client.text()
  // The selected build's hardening must be in the served bundle, not merely
  // claimed by the runner receipt. Local variable names are minified, so each
  // release family uses stable emitted UI strings; real deep-link selection is
  // separately exercised through the native selected row and gallery request.
  const marker = Number(release) >= 135
    ? 'rc135-assistant-actions-and-auth-aware-auto-reply'
    : needsReconnectEvidence
      ? 'rc134-media-timeout-and-conversation-container'
      : 'roomNavigationRevision'
  if (Number(release) >= 135) {
    assert.ok(code.includes('dsh-chatroom-assistant-actions') && code.includes('仅平台超级管理员可修改。'),
      'served client lacks the rc135 assistant-actions and auth-aware auto-reply markers')
  } else if (needsReconnectEvidence) {
    assert.ok(code.includes('图库读取超时，请重试。') && code.includes('chatroom-conversation'),
      'served client lacks the rc134 media-timeout and conversation-container markers')
  } else assert.ok(code.includes(marker), `served client lacks the ${marker} navigation marker`)
  row.servedClient = { ...served, marker }
}

const setStyleAndCheck = async (page, value, label) => {
  const select = page.getByRole('combobox', { name: '界面风格', exact: true })
  await select.selectOption(value)
  await page.waitForFunction(expected => expected === 'default'
    ? !document.documentElement.hasAttribute('data-dsh-chatroom-style')
    : document.documentElement.dataset.dshChatroomStyle === expected, value)
  const geometry = await expectNoOverflow(page, { width: 1440, height: 900 }, label)
  return { ...geometry, styleControl: await expectOperable(select, `${label}/style`) }
}

// Resizing the Host can synchronously report the previous wide sidebar while
// its ResizeObserver is about to collapse it.  Observe two equal compact-nav
// snapshots before selecting an action; this is bounded read-only waiting, not
// an arbitrary retry or a synthetic UI state.
const nativeSidebarSnapshot = async page => page.evaluate(() => {
  const visible = element => {
    const rect = element.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== 'hidden'
  }
  const controls = [...document.querySelectorAll('button')]
    .filter(visible)
    .map(button => {
      const rect = button.getBoundingClientRect()
      return {
        ariaLabel: button.getAttribute('aria-label'),
        text: (button.textContent ?? '').trim().slice(0, 48),
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      }
    })
    .filter(button => button.left + button.width / 2 < innerWidth / 2)
  // Do not retain room titles, message actions, or other transcript-adjacent
  // labels in the receipt.  Only fixed Host chrome is useful to this resize
  // race check.
  const staticChrome = controls.filter(button => (
    ['打开侧边栏', '展开侧边栏', '新建会话', '重新连接服务器'].includes(button.ariaLabel)
    || button.text === '设置'
  ))
  return {
    viewportWidth: innerWidth,
    settingsTextVisible: controls.some(button => button.text === '设置'),
    leftStaticChrome: staticChrome,
  }
})

const waitForNativeSidebarSettle = async (page, width) => {
  let previous
  let current
  for (let attempt = 0; attempt < 8; attempt += 1) {
    current = await nativeSidebarSnapshot(page)
    if (current.viewportWidth === width && JSON.stringify(current) === JSON.stringify(previous)) return current
    previous = current
    await page.waitForTimeout(100)
  }
  return current
}

const checkViewport = async (page, size, label, accountName = '我的账号') => {
  const geometry = await expectNoOverflow(page, size, label)
  let settledSidebar = await waitForNativeSidebarSettle(page, size.width)
  const account = page.getByRole('button', { name: accountName, exact: true })
  const style = page.getByRole('combobox', { name: '界面风格', exact: true })
  try {
    // At phone widths the Host may initially collapse the native left nav. The
    // Settings assertion remains real: open that existing native control then
    // wait for the actual Settings button; never synthesize DOM state.
    if (accountName === '设置') {
      // Settings is intentionally absent from a collapsed Host rail.  Perform
      // the corresponding real rail action when it is collapsed, then prove
      // the native sidebar did expand before waiting for the Settings control.
      // Doing this from the settled rail geometry—not a transient Settings
      // locator—avoids a resize frame reporting stale wide-nav markup.
      await expandLeftNativeSidebar(page)
      settledSidebar = await waitForNativeSidebarSettle(page, size.width)
    }
    await waitForVisible(account)
    await waitForVisible(style)
    const accountGeometry = await expectOperable(account, `${label}/${accountName}`)
    let navigationDismissed = false
    if (accountName === '设置' && size.width <= 768) {
      // Settings lives inside the modal mobile navigation. Its backdrop must
      // block the page while open; test the page control only after a real
      // navigation dismissal, not by requiring click-through of that backdrop.
      const collapse = page.locator('[data-slot="sidebar"]').getByRole('button', { name: '收起侧边栏', exact: true })
      await expectOperable(collapse, `${label}/collapse-navigation`)
      await collapse.click()
      await waitForAnimationFrames(page)
      await waitForNativeSidebarSettle(page, size.width)
      navigationDismissed = true
    }
    return { ...geometry, control: accountName, nativeSidebar: settledSidebar, account: accountGeometry, navigationDismissed, style: await expectOperable(style, `${label}/style`) }
  } catch (error) {
    if (await style.isVisible().catch(() => false)) {
      const scope = isolated ? 'isolated' : 'public'
      await screenshot(page, `RC${release}-${scope}-${label.replaceAll('/', '-')}-failure.png`, style)
    }
    if (isolated) {
      const diagnostic = await page.evaluate(() => {
        const box = element => {
          const rect = element.getBoundingClientRect()
          const style = getComputedStyle(element)
          return {
            tag: element.tagName,
            ariaLabel: element.getAttribute('aria-label'),
            dataSlot: element.getAttribute('data-slot'),
            className: typeof element.className === 'string' ? element.className : null,
            visible: rect.width > 0 && rect.height > 0,
            rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
            display: style.display,
            position: style.position,
          }
        }
        return {
          viewport: { width: innerWidth, height: innerHeight },
          nav: [...document.querySelectorAll('nav,[role="navigation"],[data-slot*="settings"]')].slice(0, 12).map(box),
          settingsButtonCount: [...document.querySelectorAll('button')].filter(button => button.textContent?.trim() === '设置').length,
          sidebarControls: [...document.querySelectorAll('button[aria-label*="侧边栏"]')].map(box),
        }
      })
      await screenshot(page, `RC${release}-isolated-${label.replaceAll('/', '-')}-viewport.png`)
      throw new Error(`${redacted(error)}\nIsolated navigation diagnostic: ${JSON.stringify(diagnostic)}`)
    }
    throw error
  }
}

// This is deliberately a same-context read: the UI makes this request itself,
// but retaining its status/count lets the acceptance distinguish an empty
// manageable-room directory from a failed directory request without recording
// a room id, title, account identifier, or response body.
const readSettingsAuthAndManageableRooms = async context => {
  let session
  let sessionBody
  let manageable
  let manageableBody
  let manageableRequestFailed = false
  try {
    session = await context.request.get(base + prefix + '/session', { headers: { Origin: base }, timeout: 15_000 })
    sessionBody = await session.json().catch(() => undefined)
    manageable = await context.request.get(base + prefix + '/rooms/manageable', { headers: { Origin: base }, timeout: 15_000 })
    manageableBody = await manageable.json().catch(() => undefined)
  } catch {
    manageableRequestFailed = true
  }
  const auth = sessionBody?.auth
  const roomList = Array.isArray(manageableBody?.rooms) ? manageableBody.rooms : undefined
  return {
    auth: {
      sessionStatus: session?.status() ?? null,
      enabled: typeof auth?.enabled === 'boolean' ? auth.enabled : null,
      authenticated: typeof auth?.authenticated === 'boolean' ? auth.authenticated : null,
      accountRole: typeof auth?.account?.role === 'string' ? auth.account.role : null,
    },
    manageableRooms: {
      status: manageable?.status() ?? null,
      count: roomList?.length ?? null,
      requestFailed: manageableRequestFailed,
    },
  }
}

// Settings must be exercised through the Host section navigation, rather than
// treating the dialog shell as evidence that its plugin section rendered.
// The readback retains only fixed control geometry; it never records field
// values, room names, account data, or transcript text.
const checkAgentSettings = async (page, settings, row, readback, { legacyAccountAbsent = false, scope = 'settings' } = {}) => {
  const sectionButton = page.getByRole('button', { name: '群聊与账号', exact: true })
  await expectOperable(sectionButton, `${scope}/群聊与账号 section`)
  await sectionButton.click()

  const agentRegion = page.getByRole('region', { name: 'AI 成员管理', exact: true })
  try {
    await agentRegion.waitFor({ state: 'visible', timeout: 20_000 })
  } catch (error) {
    row.settingsSectionDiagnostic = await page.evaluate(() => {
      const describe = element => {
        const rect = element.getBoundingClientRect()
        return {
          tag: element.tagName,
          role: element.getAttribute('role'),
          ariaLabel: element.getAttribute('aria-label'),
          dataTestId: element.getAttribute('data-testid'),
          className: typeof element.className === 'string' ? element.className : null,
          visible: rect.width > 0 && rect.height > 0,
        }
      }
      return {
        settingsRoots: [...document.querySelectorAll('.dsh-chatroom-settings')].map(describe),
        settingsSections: [...document.querySelectorAll('.dsh-chatroom-settings section,[role="region"]')].map(describe).slice(0, 16),
        agentDetailCardPresent: document.querySelector('[data-testid="chatroom-settings-agents"]') !== null,
        agentStatusCardPresent: document.querySelector('[data-testid="chatroom-settings-agents-status"]') !== null,
      }
    })
    await screenshot(page, 'RC133-isolated-settings-section-failure.png', settings)
    throw error
  }
  assert.equal(readback.auth.sessionStatus, 200, `${scope}: session read must succeed before interpreting auth UI`)
  assert.notEqual(readback.auth.enabled, null, `${scope}: session auth.enabled must be explicit`)
  assert.notEqual(readback.auth.authenticated, null, `${scope}: session auth.authenticated must be explicit`)
  if (legacyAccountAbsent) {
    assert.equal(readback.auth.enabled, false, `${scope}: legacy account absence check requires auth.enabled=false`)
    assert.equal(await settings.getByRole('region', { name: '账号资料', exact: true }).count(), 0,
      `${scope}: disabled legacy auth must not render an empty account-profile region`)
    assert.equal(await settings.locator('[aria-label="账号资料"]').count(), 0,
      `${scope}: disabled legacy auth must not retain an account-profile shell`)
  }

  const detailCard = page.locator('[data-testid="chatroom-settings-agents"].dsh-chatroom-agent-settings-card')
  const statusCard = page.locator('[data-testid="chatroom-settings-agents-status"].dsh-chatroom-agent-settings-card')
  const hasManageableRooms = readback.manageableRooms.status === 200 && readback.manageableRooms.count !== null && readback.manageableRooms.count > 0
  const emptyManageableRooms = readback.manageableRooms.status === 200 && readback.manageableRooms.count === 0
  if (readback.manageableRooms.status === 200) assert.notEqual(readback.manageableRooms.count, null, `${scope}: successful manageable-room response must contain rooms[]`)

  let agentCard
  let mode
  if (hasManageableRooms) {
    await detailCard.waitFor({ state: 'visible', timeout: 20_000 })
    assert.equal(await statusCard.count(), 0, `${scope}: populated manageable-room response must not substitute the status card for AI controls`)
    await detailCard.getByLabel('AI 成员名称', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 })
    await detailCard.locator('.dsh-chatroom-agents-form > label.dsh-chatroom-switch').waitFor({ state: 'visible', timeout: 20_000 })
    agentCard = detailCard
    mode = 'managed-rooms'
  } else {
    await statusCard.waitFor({ state: 'visible', timeout: 20_000 })
    assert.equal(await detailCard.count(), 0, `${scope}: empty or failed manageable-room response must not fabricate AI controls`)
    agentCard = statusCard
    if (emptyManageableRooms) {
      const status = statusCard.getByRole('status')
      await status.filter({ hasText: '暂无可管理的群聊。' }).waitFor({ state: 'visible', timeout: 20_000 })
      assert.match((await status.textContent()) ?? '', /暂无可管理的群聊/u, `${scope}: successful empty manageable-room response needs its explicit empty state`)
      mode = 'empty-manageable-rooms'
    } else {
      const alert = statusCard.getByRole('alert')
      await alert.waitFor({ state: 'visible', timeout: 20_000 })
      mode = readback.manageableRooms.requestFailed ? 'manageable-request-failed' : 'manageable-http-error'
    }
    // The state card must make the next safe, user-controlled read reachable;
    // it is intentionally not clicked, so acceptance never starts a retry loop.
    await expectOperable(statusCard.getByRole('button', { name: '重新加载可管理群聊', exact: true }), `${scope}/${mode}/reload-manageable-rooms`)
  }

  row.settingsSection = { mode, auth: readback.auth, manageableRooms: readback.manageableRooms }
  for (const styleValue of ['default', 'qq2007']) {
    const style = page.getByRole('combobox', { name: '界面风格', exact: true })
    await style.selectOption(styleValue)
    await page.waitForFunction(expected => expected === 'default'
      ? !document.documentElement.hasAttribute('data-dsh-chatroom-style')
      : document.documentElement.dataset.dshChatroomStyle === expected, styleValue)
    row.settingsSection[styleValue] = {}
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 900, inputMinFontSize: 14 },
      { name: 'narrow', width: 390, height: 844, inputMinFontSize: 16 },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await waitForNativeSidebarSettle(page, viewport.width)
      await waitForAnimationFrames(page)
      await agentRegion.waitFor({ state: 'visible', timeout: 15_000 })
      row.settingsSection[styleValue][viewport.name] = await page.locator('[role="dialog"]:has(.dsh-chatroom-settings)').evaluate(dialog => ({
        precheck: true, width: innerWidth, documentWidth: document.documentElement.scrollWidth,
        scrollX, scrollY, visibilityState: document.visibilityState,
        ancestry: (() => {
          const rows = []
          for (let node = dialog; node instanceof HTMLElement; node = node.parentElement) {
            const r = node.getBoundingClientRect(), s = getComputedStyle(node)
            rows.push({ tag: node.tagName, className: node.className, slot: node.getAttribute('data-slot'),
              side: node.getAttribute('data-side'), width: r.width, height: r.height, display: s.display, visibility: s.visibility,
              inlineStyle: node.getAttribute('style'), hidden: node.hidden,
              markers: [...node.attributes].filter(a => a.name.startsWith('data-dsh-')).map(a => [a.name, a.value]),
              displayRules: s.display !== 'none' ? [] : (() => {
                const rules = []
                const visit = items => { for (const rule of items) {
                  if (rule.selectorText && rule.style?.display && node.matches(rule.selectorText)) rules.push({ selector: rule.selectorText, display: rule.style.display, priority: rule.style.getPropertyPriority('display') })
                  if (rule.cssRules) visit(rule.cssRules)
                } }
                for (const sheet of document.styleSheets) { try { visit(sheet.cssRules) } catch {} }
                return rules.slice(-12)
              })(),
            })
          }
          return rows
        })(),
        dialogs: [...document.querySelectorAll('dialog[open], [role="dialog"]')].map(element => ({
          tag: element.tagName, ariaLabel: element.getAttribute('aria-label'), ariaHidden: element.getAttribute('aria-hidden'),
          modal: element.matches(':modal'), inert: element.inert, parentInert: element.closest('[inert]') !== null,
        })),
        overflowing: [dialog, ...dialog.querySelectorAll('*')].filter(element => {
          const r = element.getBoundingClientRect()
          return r.width > 0 && r.height > 0 && (r.right > innerWidth + 1 || r.left < -1)
        }).slice(0, 24).map(element => {
          const r = element.getBoundingClientRect()
          const s = getComputedStyle(element)
          return { tag: element.tagName, className: typeof element.className === 'string' ? element.className : null,
            left: r.left, right: r.right, width: r.width, minWidth: s.minWidth, display: s.display, gridTemplateColumns: s.gridTemplateColumns }
        }),
      }))
      const overflow = await expectNoOverflow(page, { width: viewport.width, height: viewport.height }, `isolated/settings/${styleValue}/${viewport.name}`)
      const editableSwitch = agentCard.locator('.dsh-chatroom-agents-form > label.dsh-chatroom-switch')
      if (await editableSwitch.count() > 0) {
        assert.equal(await editableSwitch.isVisible(), true, 'Settings switch became hidden after viewport change; inspect precheck ancestry')
        await editableSwitch.scrollIntoViewIfNeeded()
      }
      const geometry = await agentCard.evaluate(card => {
      const box = element => {
        const rect = element.getBoundingClientRect()
        const style = getComputedStyle(element)
        return {
          left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height,
          fontSize: Number.parseFloat(style.fontSize), gridColumn: style.gridColumn, paddingLeft: Number.parseFloat(style.paddingLeft),
          tag: element.tagName, className: typeof element.className === 'string' ? element.className : null,
        }
      }
      const root = card.closest('.dsh-chatroom-settings')
      const input = card.querySelector('[aria-label="AI 成员名称"]')
      const inputLabel = input?.closest('label')
      const switchLabel = card.querySelector('.dsh-chatroom-agents-form > label.dsh-chatroom-switch')
      const track = switchLabel?.querySelector(':scope > span[aria-hidden]')
      const trackBox = track === null || track === undefined ? null : box(track)
      const trackHit = trackBox === null ? null : document.elementFromPoint(trackBox.left + trackBox.width / 2, trackBox.top + trackBox.height / 2)
      const switchBox = switchLabel === null ? null : box(switchLabel)
      const switchHit = switchBox === null ? null : document.elementFromPoint(switchBox.left + switchBox.width / 2, switchBox.top + switchBox.height / 2)
      const controls = [...(root?.querySelectorAll('input:not([type="checkbox"]), select, textarea') ?? [])]
        .filter(control => { const rect = control.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 })
        .map(box)
      const controlLabels = [...(root?.querySelectorAll('label') ?? [])]
        .filter(label => label.querySelector('input:not([type="checkbox"]), select, textarea') !== null)
        .filter(label => { const rect = label.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 })
        .map(box)
      return {
        root: root === null ? null : box(root),
        card: box(card),
        input: input === null || input === undefined ? null : box(input),
        inputLabel: inputLabel === null || inputLabel === undefined ? null : box(inputLabel),
        controls, controlLabels,
        switchLabel: switchBox,
        track: trackBox,
        trackHit: track === null || track === undefined ? false : trackHit === track || track.contains(trackHit),
        switchLabelHit: switchLabel === null ? false : switchHit === switchLabel || switchLabel.contains(switchHit),
        hitElement: trackHit === null ? null : { tag: trackHit.tagName, className: typeof trackHit.className === 'string' ? trackHit.className : null, slot: trackHit.closest('[data-slot]')?.getAttribute('data-slot') },
      }
    })
    row.settingsSection[styleValue][viewport.name] = { ...overflow, ...geometry }
    assert.ok(geometry.root !== null, `${scope}/${viewport.name}: AI card must remain inside the settings root`)
    assert.equal(geometry.card.gridColumn, '1 / -1', `${viewport.name}: AI card must occupy the full settings grid`)
    assert.ok(Math.abs(geometry.card.left - geometry.root.left) <= 1 && Math.abs(geometry.card.right - geometry.root.right) <= 1,
      `${viewport.name}: AI card must align with the settings root`)
    assert.ok(geometry.card.paddingLeft >= 14, `${scope}/${viewport.name}: AI card padding must be at least 14px`)
    if (hasManageableRooms) {
      assert.ok(geometry.input !== null && geometry.inputLabel !== null, `${scope}/${viewport.name}: AI name field and label must render for manageable rooms`)
      assert.ok(geometry.switchLabel !== null && geometry.track !== null, `${scope}/${viewport.name}: AI enabled switch must render for manageable rooms`)
      assert.ok(geometry.inputLabel.fontSize >= 14, `${scope}/${viewport.name}: AI input label font must be at least 14px`)
      assert.ok(geometry.input.fontSize >= viewport.inputMinFontSize,
        `${scope}/${viewport.name}: AI name control font must be at least ${viewport.inputMinFontSize}px`)
      assert.ok(geometry.controls.length > 0, `${scope}/${viewport.name}: settings must retain visible editable controls`)
      assert.ok(geometry.controls.every(control => control.fontSize >= viewport.inputMinFontSize),
        `${scope}/${viewport.name}: every visible settings control must be at least ${viewport.inputMinFontSize}px`)
      assert.ok(geometry.controlLabels.every(label => label.fontSize >= 14), `${scope}/${viewport.name}: editable control labels must be at least 14px`)
      assert.ok(geometry.switchLabel.width >= 44 && geometry.switchLabel.height >= 44,
        `${scope}/${viewport.name}: AI enabled label target must be at least 44×44px`)
      assert.ok(Math.abs(geometry.track.width - 38) <= 1 && Math.abs(geometry.track.height - 22) <= 1,
        `${scope}/${viewport.name}: AI enabled switch track must be 38×22px`)
      assert.ok(geometry.trackHit, `${scope}/${viewport.name}: AI enabled switch track is covered`)
      assert.ok(geometry.switchLabelHit, `${scope}/${viewport.name}: AI enabled label is covered`)
    }
      if (styleValue === 'default' && viewport.name === 'desktop') {
        await screenshot(page, scope.startsWith('isolated') ? 'RC133-isolated-settings.png' : 'RC133-public-super-admin-settings.png', settings)
      }
    }
  }
  const style = page.getByRole('combobox', { name: '界面风格', exact: true })
  await style.selectOption('default')
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-dsh-chatroom-style'))
  await page.setViewportSize({ width: 1440, height: 900 })
}

const checkHostNarrowMessageGeometry = async (page, row) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await waitForNativeSidebarSettle(page, 320)
  await waitForAnimationFrames(page)
  const qq = await page.evaluate(() => {
    // The Host slot itself is display:contents. Its visible parent is the
    // conversation rail; measuring the slot would produce a false 0×0 bound.
    const conversation = [...document.querySelectorAll('div:has(> [data-slot="conversation"])')]
      .find(element => { const rect = element.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 })
    const tools = [...document.querySelectorAll('.dsh-chatroom-assistant-tools')]
      .find(element => { const rect = element.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 })
    const actions = tools?.querySelector('.dsh-chatroom-assistant-actions, .dsh-chatroom-message-actions')
    const longBubble = [...document.querySelectorAll('.dsh-chatroom-human-bubble, .dsh-chatroom-native-message')]
      .filter(element => element.textContent?.trim().length >= 80)
      .map(element => {
        const rect = element.getBoundingClientRect()
        return { width: rect.width, right: rect.right, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }
      })
      .sort((left, right) => right.width - left.width)[0]
    const rect = value => value === undefined ? null : (() => {
      const box = value.getBoundingClientRect()
      return { left: box.left, right: box.right, width: box.width, height: box.height, scrollWidth: value.scrollWidth, clientWidth: value.clientWidth }
    })()
    return { conversation: rect(conversation), tools: rect(tools), actions: rect(actions), longBubble }
  })
  let composerControls
  let expandedSidebar
  try {
    assert.ok(qq.conversation !== null && qq.tools !== null && qq.actions !== null, 'QQ narrow Host assistant-actions surface missing')
    assert.ok(qq.tools.width > 200, `QQ narrow Host assistant-tools rail too narrow: ${qq.tools.width}`)
    assert.ok(qq.tools.right <= qq.conversation.right + 1, 'QQ narrow Host assistant-tools exceeds conversation rail')
    assert.ok(qq.actions.height <= 36, `QQ narrow Host assistant actions wrapped vertically: ${qq.actions.height}`)
    assert.ok(qq.actions.scrollWidth <= qq.actions.clientWidth + 1, 'QQ narrow Host assistant actions overflow horizontally')
    assert.ok(qq.longBubble !== undefined, 'QQ narrow room lacks a long human/native bubble for percentage-cap regression check')
    assert.ok(qq.longBubble.width >= 200, `QQ narrow long human bubble cap is too small: ${qq.longBubble.width}`)
    assert.ok(qq.longBubble.right <= 321, 'QQ narrow long human bubble exceeds viewport')
    assert.ok(qq.longBubble.scrollWidth <= qq.longBubble.clientWidth + 1, 'QQ narrow long human bubble has horizontal overflow')

    composerControls = needsFilesComposerEvidence
      ? await ensureNativeComposerControlGeometry(page, 'QQ narrow native composer', state => { composerControls = state })
      : undefined
    // This reversible expansion is deliberately after the composer check: an
    // opened mobile drawer can cover the center pane by design, but its own
    // category list must still be free of horizontal overflow.
    expandedSidebar = needsFilesComposerEvidence
      ? await checkExpandedSidebarOverflow(page)
      : undefined
  } catch (error) {
    // Persist geometry before rethrowing.  The locator clip is action chrome
    // only, so this failure evidence does not capture room transcript text.
    row.hostNarrowGeometry = { qq, composerControls, failure: redacted(error) }
    const tools = page.locator('.dsh-chatroom-assistant-tools').first()
    if (await tools.isVisible().catch(() => false)) await screenshot(page, `RC${release}-public-${row.role ?? 'super-admin'}-qq-narrow-failure.png`, tools)
    throw error
  }

  const style = page.getByRole('combobox', { name: '界面风格', exact: true })
  await style.selectOption('default')
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-dsh-chatroom-style'))
  row.hostNarrowGeometry = { qq, ...(composerControls === undefined ? {} : { composerControls, expandedSidebar }) }
  // Default skin deliberately uses icon-only actions below 640px. Verify its
  // labels outside that existing viewport rule, while Files keeps the actual
  // conversation narrow enough to exercise the QQ-only container override.
  await page.setViewportSize({ width: 924, height: 844 })
  // The preceding phone check may leave the native rail collapsed. Expand it
  // at desktop width before opening Files so this is genuinely the narrow
  // conversation counterexample, not a 548px center pane with a 56px rail.
  await expandLeftNativeSidebar(page)
  await openNativeFiles(page)
  await waitForAnimationFrames(page)
  row.hostNarrowGeometry.nativeCounterexample = await page.evaluate(() => {
    const parent = [...document.querySelectorAll('div:has(> [data-slot="conversation"])')]
      .find(element => element.getBoundingClientRect().width > 0)
    return { viewportWidth: innerWidth, conversationWidth: parent?.getBoundingClientRect().width }
  })
  assert.ok(row.hostNarrowGeometry.nativeCounterexample.conversationWidth <= 544, 'default counterexample needs a narrow conversation, not a wide page')
  const native = await page.evaluate(() => [...document.querySelectorAll('.dsh-chatroom-assistant-tools .dsh-chatroom-action-label')]
    .filter(element => { const rect = element.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 })
    .map(element => getComputedStyle(element).display))
  assert.ok(native.length > 0, 'native-style counterexample missing assistant action labels')
  assert.ok(native.every(display => display !== 'none'), 'native-style counterexample unexpectedly hides assistant action labels')
  row.hostNarrowGeometry.nativeActionLabelsVisible = true
}

const nativeLoginUrl = async () => {
  // Match this cold-start attempt; an earlier log contains an expired token.
  const stdout = await readFile(staticArtifact(`RC${release}-isolated${receiptSuffix}.stdout.log`), 'utf8')
  const login = stdout.match(/http:\/\/127\.0\.0\.1:3186\/\?token=[^\s]+/u)?.[0]
  assert.ok(login, `RC${release} isolated native login URL missing`)
  return login
}

// The local DSH test-login endpoint intentionally responds 303 with a
// connection that can remain open after headers.  Playwright's API request
// waits for that body and therefore times out despite receiving Set-Cookie.
// Read only the redirect headers through Node fetch, immediately cancel its
// body, and inject the exact cookie into this fresh, non-persistent context.
// This helper is exclusively for 127.0.0.1 isolated bootstrap; public auth
// continues through its normal Playwright/secrets path.
const establishIsolatedNativeLogin = async context => {
  const login = await nativeLoginUrl()
  const response = await fetch(login, { redirect: 'manual', signal: AbortSignal.timeout(10_000) })
  try {
    assert.ok([200, 303].includes(response.status), 'native test login must establish the local session')
    const setCookie = response.headers.getSetCookie?.()[0] ?? response.headers.get('set-cookie')
    assert.ok(setCookie, 'native test login must provide a session cookie')
    const [nameValue] = setCookie.split(';', 1)
    const separator = nameValue.indexOf('=')
    assert.ok(separator > 0, 'native test login returned malformed session cookie')
    const url = new URL(login)
    await context.addCookies([{
      name: nameValue.slice(0, separator),
      value: nameValue.slice(separator + 1),
      domain: url.hostname,
      path: '/',
      httpOnly: /;\s*httponly(?:;|$)/iu.test(setCookie),
      secure: /;\s*secure(?:;|$)/iu.test(setCookie),
      sameSite: /;\s*samesite=strict(?:;|$)/iu.test(setCookie) ? 'Strict' : /;\s*samesite=lax(?:;|$)/iu.test(setCookie) ? 'Lax' : 'None',
    }])
    return { status: response.status }
  } finally {
    await response.body?.cancel().catch(() => undefined)
  }
}

const publicProxy = () => {
  const value = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY
  if (!value) return undefined
  const url = new URL(value)
  return {
    server: url.origin,
    bypass: 'localhost,127.0.0.1',
    ...(url.username ? { username: decodeURIComponent(url.username), password: decodeURIComponent(url.password) } : {}),
  }
}

const loginPublic = async (context, role) => {
  const secrets = JSON.parse((await readFile('C:/Users/datoo/.dsh/service/chatroom-secrets.json', 'utf8')).replace(/^\uFEFF/, ''))
  // An opt-in diagnostic path separates Playwright APIResponse body hangs
  // from the real public authentication endpoint. It still logs in through
  // that endpoint and transfers only its same-origin cookie to this fresh
  // owned test context; browser UI requests remain unmodified.
  if (process.env.RC_PUBLIC_LOGIN_TRANSPORT === 'fetch') {
    assert.equal(isolated, false)
    if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) assert.equal(process.env.NODE_USE_ENV_PROXY, '1')
    const response = await fetch(base + prefix + '/auth/login', {
      method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: role === 'member' ? secrets.testUsername : secrets.adminUsername, password: role === 'member' ? secrets.testPassword : secrets.adminPassword }),
      signal: AbortSignal.timeout(20_000), redirect: 'error',
    })
    assert.equal(response.status, 200, `${role} public fetch login`)
    const session = await response.json()
    assert.equal(session.auth.account.role, role)
    const cookies = response.headers.getSetCookie().map(header => {
      const pair = header.split(';', 1)[0]
      const equal = pair.indexOf('=')
      assert.ok(equal > 0)
      return { name: pair.slice(0, equal), value: pair.slice(equal + 1), domain: new URL(base).hostname,
        path: /;\s*path=([^;]+)/iu.exec(header)?.[1] ?? '/',
        httpOnly: /;\s*httponly(?:;|$)/iu.test(header), secure: /;\s*secure(?:;|$)/iu.test(header),
        sameSite: /;\s*samesite=strict(?:;|$)/iu.test(header) ? 'Strict' : 'Lax' }
    })
    assert.ok(cookies.length > 0, 'public login cookie required')
    await bounded(context.addCookies(cookies), 'public test context cookie transfer', 15_000)
    return session
  }
  const login = await context.request.post(base + prefix + '/auth/login', {
    headers: { Origin: base },
    data: {
      username: role === 'member' ? secrets.testUsername : secrets.adminUsername,
      password: role === 'member' ? secrets.testPassword : secrets.adminPassword,
    },
    timeout: 20_000,
  })
  assert.equal(login.status(), 200, `${role} login`)
  const session = await login.json()
  assert.equal(session.auth.account.role, role)
  return session
}

const galleryCount = async (context, room) => {
  const query = new URLSearchParams({ roomId: room.id, sessionId: String(room.sessionId) })
  const response = await context.request.get(`${base}${prefix}/media/gallery?${query}`, { headers: { Origin: base }, timeout: 15_000 })
  assert.equal(response.status(), 200, 'authorized media gallery read')
  const page = await response.json()
  return Array.isArray(page.items) ? page.items.length : 0
}

const assertAnonymousGalleryDenied = async (browser, room) => {
  const query = new URLSearchParams({ roomId: room.id, sessionId: String(room.sessionId) })
  const anonymous = await browser.newContext()
  try {
    const response = await anonymous.request.get(`${base}${prefix}/media/gallery?${query}`, { timeout: 15_000 })
    assert.equal(response.status(), 401, 'anonymous gallery read must be denied')
    await response.body()
    return 401
  } finally { await closeBrowserContext(anonymous, 'anonymous gallery context close') }
}

const checkMemberDenials = async (context, room, row) => {
  for (const [method, args] of [
    ['settings/describe', {}],
    ['credentials/list', {}],
    ['session/selectModel', { sessionId: room.sessionId, provider: 'invalid-rc133-route', model: 'invalid-rc133-model' }],
    ['agentPresets/select', { sessionId: room.sessionId, presetId: 'invalid-rc133-preset' }],
    ['commands/execute', { sessionId: room.sessionId, line: '/permission invalid-rc133' }],
  ]) {
    const response = await context.request.post(`${base}/api/${method}`, {
      headers: { Origin: base },
      data: { type: 'client-request', rpcId: `rc133-denial-${method}`, method, payload: { args } },
      timeout: 15_000,
    })
    row.rpc.push({ method, status: response.status() })
    assert.equal(response.status(), 403, `member ${method} must be refused`)
  }
}

const collectMemberProbeState = async (page, room) => page.evaluate(expected => {
  const selected = [...document.querySelectorAll('div[role="treeitem"][aria-selected="true"]')]
  const selectedTarget = selected.some(row => row.getAttribute('data-dsh-chatroom-session-id') === expected.sessionId
    && row.textContent?.includes(expected.title) === true)
  const tree = document.querySelector('[role="tree"]')
  const status = document.querySelector('.dsh-chatroom-server-status')
  const account = [...document.querySelectorAll('button[aria-label="我的账号"]')]
  const logout = [...document.querySelectorAll('button')].filter(button => button.textContent?.trim() === '退出登录')
  const box = tree?.getBoundingClientRect()
  return {
    documentTitle: document.title,
    active: document.documentElement.hasAttribute('data-dsh-chatroom-active'),
    loginFormVisible: document.querySelector('[aria-label="系统登录"]') !== null,
    identityFormVisible: document.querySelector('[data-testid="chatroom-identity-input"]') !== null,
    roomDirectoryVisible: document.querySelector('[data-testid="chatroom-room-list"]') !== null,
    alertVisible: document.querySelector('[role="alert"]') !== null,
    nativeTree: {
      present: tree !== null,
      visible: box !== undefined && box.width > 0 && box.height > 0,
      selectedCount: selected.length,
      targetSelected: selectedTarget,
    },
    sidebar: {
      collapsed: status?.getAttribute('data-wide') === 'false',
      statusPresent: status !== null,
      native: status?.getAttribute('data-native') ?? null,
      room: status?.getAttribute('data-room') ?? null,
      notifications: status?.getAttribute('data-notifications') ?? null,
    },
    accountControl: { count: account.length, visible: account.some(button => {
      const rect = button.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    }) },
    logoutControl: { count: logout.length, visible: logout.some(button => {
      const rect = button.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    }) },
    composerVisible: document.querySelector('textarea, [contenteditable="true"]') !== null,
  }
}, { sessionId: String(room.sessionId), title: room.title })

const runMemberProbe = async browser => {
  const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1440, height: 900 } })
  try {
    const login = await loginPublic(context, 'member')
    const room = login.rooms.find(item => item.title === memberAcceptanceRoomTitle && item.id && item.sessionId)
    assert.ok(room, 'member probe: fixed authorized acceptance room missing from login session')
    const session = await context.request.get(base + prefix + '/session', { headers: { Origin: base }, timeout: 20_000 })
    const sessionBody = await session.json().catch(() => undefined)
    memberProbeReceipt.authSession = {
      loginStatus: 200,
      sessionStatus: session.status(),
      role: sessionBody?.auth?.account?.role ?? null,
      authenticated: sessionBody?.auth?.authenticated === true,
      identityPresent: sessionBody?.identity !== undefined && sessionBody?.identity !== null,
      authorizedRoomPresent: Array.isArray(sessionBody?.rooms) && sessionBody.rooms.some(item => item?.title === memberAcceptanceRoomTitle),
    }
    const page = await context.newPage()
    const selections = []
    const onResponse = response => {
      const url = new URL(response.url())
      if (!url.pathname.endsWith('/rooms/select')) return
      let requestedTarget = false
      try { requestedTarget = response.request().postDataJSON()?.roomId === room.id } catch {}
      selections.push({ status: response.status(), requestedTarget })
    }
    page.on('response', onResponse)
    let deepLinkError
    try { await openExistingRoom(page, room, { role: 'member-probe' }) } catch (error) { deepLinkError = error }
    await page.waitForTimeout(2_000)
    memberProbeReceipt.network = { roomsSelect: selections }
    memberProbeReceipt.page = await collectMemberProbeState(page, room)
    const viewport = page.viewportSize() ?? { width: 1440, height: 900 }
    // Actual page chrome only: crop the native sidebar, never the transcript.
    await page.screenshot({ path: artifact(`RC${release}-public-member-deep-link-probe.png`), clip: { x: 0, y: 0, width: Math.min(460, viewport.width), height: viewport.height } })
    memberProbeReceipt.screenshot = `RC${release}-public-member-deep-link-probe.png`
    if (deepLinkError !== undefined) throw deepLinkError
    memberProbeReceipt.passed = memberProbeReceipt.page.nativeTree.targetSelected === true
  } catch (error) {
    memberProbeReceipt.error = redacted(error)
    process.exitCode = 1
  } finally { await closeBrowserContext(context, 'member probe context close') }
}

const controlDiagnostic = async (page, locator) => locator.evaluate(element => {
  const rect = element.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  const hit = document.elementFromPoint(x, y)
  const describe = node => node === null ? null : ({
    tag: node.tagName,
    role: node.getAttribute('role'),
    ariaLabel: node.getAttribute('aria-label'),
    className: typeof node.className === 'string' ? node.className : null,
    dataSlot: node.getAttribute('data-slot'),
    dataTestId: node.getAttribute('data-testid'),
    title: node.getAttribute('title'),
  })
  const ancestry = []
  for (let node = hit; node instanceof Element && ancestry.length < 12; node = node.parentElement) {
    const box = node.getBoundingClientRect()
    const style = getComputedStyle(node)
    ancestry.push({
      ...describe(node),
      rect: { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height },
      pointerEvents: style.pointerEvents,
      position: style.position,
      zIndex: style.zIndex,
      containsStyleSelect: node.contains(element),
    })
  }
  const closestButton = hit instanceof Element ? hit.closest('button') : null
  return {
    target: describe(element), hit: describe(hit),
    center: { x, y }, rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
    hitIsTarget: hit === element || element.contains(hit),
    hitInsideStyleSelect: hit instanceof Element && hit.closest('select') !== null,
    styleSelectContainsHit: hit instanceof Node && element.contains(hit),
    closestButton: describe(closestButton),
    closestButtonIsAbsolute: closestButton === null ? false : getComputedStyle(closestButton).position === 'absolute',
    ancestry,
  }
})

const runSaStyleDomProbe = async browser => {
  const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1440, height: 900 } })
  try {
    const session = await loginPublic(context, 'super-admin')
    const room = session.rooms.find(item => item.title === '全国可飞')
    assert.ok(room, 'SA style DOM probe: 全国可飞 missing')
    const page = await context.newPage()
    await openExistingRoom(page, room, { role: 'super-admin-style-dom-probe' })
    await setStyleAndCheck(page, 'qq2007', 'sa-style-dom-probe/1440')
    await page.setViewportSize({ width: 768, height: 900 })
    const style = page.getByRole('combobox', { name: '界面风格', exact: true })
    await waitForVisible(style)
    saStyleDomProbeReceipt.readbacks = {
      viewport: { width: 768, height: 900 },
      style: await controlDiagnostic(page, style),
      detailsPresent: await page.locator('[data-slot="details"]').count(),
    }
    saStyleDomProbeReceipt.passed = true
  } catch (error) {
    saStyleDomProbeReceipt.error = redacted(error)
    process.exitCode = 1
  } finally { await closeBrowserContext(context, 'SA style DOM probe context close') }
}

const bottomPanelToggleDiagnostic = async (page, style) => {
  const toggle = page.locator('button[aria-label*="底部面板"]').first()
  await toggle.waitFor({ state: 'visible', timeout: 20_000 })
  const toggleState = await toggle.evaluate(element => {
    const describe = node => {
      const rect = node.getBoundingClientRect()
      const style = getComputedStyle(node)
      return {
        tag: node.tagName,
        ariaLabel: node.getAttribute('aria-label'),
        className: typeof node.className === 'string' ? node.className : null,
        rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
        pointerEvents: style.pointerEvents,
        position: style.position,
        zIndex: style.zIndex,
      }
    }
    let absoluteCluster = null
    for (let node = element.parentElement; node instanceof Element; node = node.parentElement) {
      if (getComputedStyle(node).position === 'absolute') { absoluteCluster = describe(node); break }
    }
    return { button: describe(element), absoluteCluster }
  })
  return { ...toggleState, style: await controlDiagnostic(page, style) }
}

const runSaStyleToggleProbe = async browser => {
  const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1440, height: 900 } })
  try {
    const session = await loginPublic(context, 'super-admin')
    const room = session.rooms.find(item => item.title === '全国可飞')
    assert.ok(room, 'SA bottom-panel toggle probe: 全国可飞 missing')
    const page = await context.newPage()
    await openExistingRoom(page, room, { role: 'super-admin-style-toggle-probe' })
    await setStyleAndCheck(page, 'qq2007', 'sa-style-toggle-probe/1440')
    await page.setViewportSize({ width: 768, height: 900 })
    const style = page.getByRole('combobox', { name: '界面风格', exact: true })
    await waitForVisible(style)
    const before = await bottomPanelToggleDiagnostic(page, style)
    const initialLabel = before.button.ariaLabel
    assert.ok(initialLabel, 'bottom-panel toggle must expose an aria-label')
    const toggle = page.locator('button[aria-label*="底部面板"]').first()
    await expectOperable(toggle, 'SA 768/bottom-panel toggle')
    await toggle.click()
    await page.waitForFunction(previous => [...document.querySelectorAll('button[aria-label*="底部面板"]')]
      .some(button => button.getAttribute('aria-label') !== previous), initialLabel, { timeout: 15_000 })
    const expanded = await bottomPanelToggleDiagnostic(page, style)
    await page.locator('button[aria-label*="底部面板"]').first().click()
    await page.waitForFunction(previous => [...document.querySelectorAll('button[aria-label*="底部面板"]')]
      .some(button => button.getAttribute('aria-label') === previous), initialLabel, { timeout: 15_000 })
    const restored = await bottomPanelToggleDiagnostic(page, style)
    saStyleToggleProbeReceipt.readbacks = { viewport: { width: 768, height: 900 }, before, expanded, restored }
    assert.equal(restored.button.ariaLabel, initialLabel, 'bottom-panel toggle must return to its original label')
    saStyleToggleProbeReceipt.passed = true
  } catch (error) {
    saStyleToggleProbeReceipt.error = redacted(error)
    process.exitCode = 1
  } finally { await closeBrowserContext(context, 'SA style toggle probe context close') }
}

const runSaDeepLinkProbe = async browser => {
  const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1440, height: 900 } })
  try {
    const session = await loginPublic(context, 'super-admin')
    const room = session.rooms.find(item => item.title === '全国可飞')
    assert.ok(room, 'SA deep-link probe: 全国可飞 missing')
    const page = await context.newPage()
    const row = { role: 'super-admin-deep-link-probe' }
    const selectResponses = []
    const onResponse = response => {
      if (new URL(response.url()).pathname.endsWith('/rooms/select')) selectResponses.push({ status: response.status() })
    }
    page.on('response', onResponse)
    try { await openExistingRoom(page, room, row) } catch (error) { row.error = redacted(error) }
    finally { page.off('response', onResponse) }
    saDeepLinkProbeReceipt.readbacks = { deepLink: row.deepLink, selectResponses }
    const viewport = page.viewportSize() ?? { width: 1440, height: 900 }
    await page.screenshot({ path: artifact(`RC${release}-public-super-admin-deep-link-probe.png`), clip: { x: 0, y: 0, width: Math.min(460, viewport.width), height: viewport.height } })
    saDeepLinkProbeReceipt.screenshot = `RC${release}-public-super-admin-deep-link-probe.png`
    if (row.error !== undefined) throw new Error(row.error)
    saDeepLinkProbeReceipt.passed = true
  } catch (error) {
    saDeepLinkProbeReceipt.error = redacted(error)
    process.exitCode = 1
  } finally { await closeBrowserContext(context, 'SA deep-link probe context close') }
}

const runSaContinuationProbe = async browser => {
  const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1440, height: 900 } })
  const row = { role: 'super-admin', rpc: [], errors: [], geometry: {} }
  try {
    const session = await loginPublic(context, 'super-admin')
    const room = session.rooms.find(item => item.title === '全国可飞')
    assert.ok(room, 'SA continuation: 全国可飞 missing')
    row.mediaRoom = { kind: 'national-fly', preflightItems: await galleryCount(context, room) }
    assert.ok(row.mediaRoom.preflightItems >= 2, '全国可飞 no longer has the required gallery media')
    const page = await context.newPage()
    page.on('pageerror', error => recordCompactPageError(row.errors, error))
    await openExistingRoom(page, room, row)
    row.geometry.native = await setStyleAndCheck(page, 'default', 'super-admin-continuation/native/1440')
    row.geometry.qq2007 = await setStyleAndCheck(page, 'qq2007', 'super-admin-continuation/qq2007/1440')
    await checkHostNarrowMessageGeometry(page, row)
    await checkGallery(page, row, `RC${release}-public-super-admin-continuation-gallery.png`, room)
    for (const size of [{ width: 768, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 720 }]) {
      row.geometry[`${size.width}`] = await checkViewport(page, size, `super-admin-continuation/${size.width}`, '▧ 会话图库')
    }
    await page.setViewportSize({ width: 1440, height: 900 })
    for (const [name, image] of [['AI 成员', `RC${release}-public-super-admin-continuation-ai-files.png`], ['群管理', `RC${release}-public-super-admin-continuation-group-files.png`]]) {
      row.files = await openNativeFiles(page)
      if (needsFilesComposerEvidence) row.files.composerControls = await ensureNativeComposerControlGeometry(page, `super-admin-continuation/${name}/composer`)
      await page.getByRole('button', { name, exact: true }).click()
      const dialog = page.getByRole('dialog', { name, exact: true })
      row[name] = await ensureTopLayerOverFiles(page, dialog, name)
      await screenshot(page, image, dialog)
      await page.keyboard.press('Escape')
      await dialog.waitFor({ state: 'hidden', timeout: 10_000 })
    }
    if (needsReconnectEvidence) await checkManualReconnect(page, room, row)
    assert.deepEqual(row.errors, [])
    saContinuationProbeReceipt.readbacks = row
    saContinuationProbeReceipt.passed = true
  } catch (error) {
    saContinuationProbeReceipt.readbacks = row
    saContinuationProbeReceipt.error = redacted(error)
    process.exitCode = 1
  } finally { await closeBrowserContext(context, 'SA continuation probe context close') }
}

const runSaFilesProbe = async browser => {
  const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1440, height: 900 } })
  try {
    const session = await loginPublic(context, 'super-admin')
    const room = session.rooms.find(item => item.title === '全国可飞')
    assert.ok(room, 'SA Files probe: 全国可飞 missing')
    const page = await context.newPage()
    const row = { role: 'super-admin-files-probe' }
    await openExistingRoom(page, room, row)
    saFilesProbeReceipt.readbacks = {
      deepLink: row.deepLink,
      // Inspect the real Host workbench without assuming the legacy details
      // slot.  Only structural, non-transcript metadata is retained.
      workbench: await page.evaluate(() => {
        const visible = element => {
          const rect = element.getBoundingClientRect()
          return rect.width > 0 && rect.height > 0
        }
        const rect = element => {
          const box = element.getBoundingClientRect()
          return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height }
        }
        const files = [...document.querySelectorAll('button,[role="tab"],[role="button"],a,div,span')]
          .filter(visible)
          .filter(element => element.textContent?.trim() === 'Files')
          .slice(0, 12)
          .map(element => ({
            tag: element.tagName,
            role: element.getAttribute('role'),
            ariaLabel: element.getAttribute('aria-label'),
            title: element.getAttribute('title'),
            rect: rect(element),
            panel: element.closest('[data-dsh-panel="true"]') !== null,
            pane: element.closest('[data-dsh-pane]')?.getAttribute('data-dsh-pane') ?? null,
          }))
        const panels = [...document.querySelectorAll('[data-dsh-panel="true"]')]
          .filter(visible)
          .map(element => ({ rect: rect(element), pane: element.closest('[data-dsh-pane]')?.getAttribute('data-dsh-pane') ?? null }))
        return { files, panels }
      }),
      details: await page.evaluate(() => [...document.querySelectorAll('[data-slot="details"]')].map(element => {
        const rect = element.getBoundingClientRect()
        const text = element.textContent?.replace(/\s+/gu, ' ').trim() ?? ''
        return {
          visible: rect.width > 0 && rect.height > 0,
          rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
          dataState: element.getAttribute('data-state'),
          ariaExpanded: element.getAttribute('aria-expanded'),
          childTags: [...element.children].slice(0, 12).map(child => child.tagName),
          hasFilesExactText: [...element.querySelectorAll('*')].some(child => child.textContent?.trim() === 'Files'),
          text: text.length === 0 ? '' : `[present:${text.includes('Files') ? 'Files' : 'nonempty'};length:${text.length}]`,
        }
      })),
    }
    saFilesProbeReceipt.passed = saFilesProbeReceipt.readbacks.workbench.files.length > 0
    if (!saFilesProbeReceipt.passed) throw new Error('native workbench has no visible Files entry in this fresh public SA context')
  } catch (error) {
    saFilesProbeReceipt.error = redacted(error)
    process.exitCode = 1
  } finally { await closeBrowserContext(context, 'SA Files probe context close') }
}

// A bounded contentless measurement for a reported 320px regression.  It does
// not assert success: the receipt separates successful observation from the
// acceptance thresholds that a source fix must satisfy.
const runSaNarrowProbe = async browser => {
  const context = await bounded(browser.newContext({ locale: 'zh-CN', viewport: { width: 1440, height: 900 } }), 'SA narrow context creation', 15_000)
  const row = { role: 'super-admin-narrow-probe' }
  try {
    const session = await loginPublic(context, 'super-admin')
    const room = session.rooms.find(item => item.title === '全国可飞')
    assert.ok(room, 'SA narrow probe: 全国可飞 missing')
    const page = await context.newPage()
    await openExistingRoom(page, room, row)
    if (process.env.RC_FOOTER_COMPAT_PROBE === '1') {
      const source = await readFile(join(here, '../src/client/responsive-styles.ts'), 'utf8')
      const css = source.slice(source.indexOf('`') + 1, source.lastIndexOf('`'))
      await page.addStyleTag({ content: css })
      saNarrowProbeReceipt.scope.push('TEMPORARY candidate responsive CSS in this owned page; not proof of a deployed bundle')
      saNarrowProbeReceipt.candidateCssSha256 = createHash('sha256').update(css).digest('hex')
    }
    await page.getByRole('combobox', { name: '界面风格', exact: true }).selectOption('qq2007')
    await page.setViewportSize({ width: 320, height: 720 })
    await waitForNativeSidebarSettle(page, 320)
    const state = await page.evaluate(() => {
      const conversation = [...document.querySelectorAll('div:has(> [data-slot="conversation"])')]
        .find(element => { const rect = element.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 })
      const bubble = [...document.querySelectorAll('.dsh-chatroom-human-bubble, .dsh-chatroom-native-message')]
        .filter(element => element.textContent?.trim().length >= 80)
        .map(element => {
          const rect = element.getBoundingClientRect()
          const style = getComputedStyle(element)
          const describe = node => {
            const box = node.getBoundingClientRect()
            const computed = getComputedStyle(node)
            return {
              tag: node.tagName,
              className: typeof node.className === 'string' ? node.className : null,
              role: node.getAttribute('role'),
              dataSlot: node.getAttribute('data-slot'),
              dataDshAttributeNames: [...node.attributes].filter(attribute => attribute.name.startsWith('data-dsh-'))
                .map(attribute => attribute.name),
              rect: { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height },
              width: computed.width,
              maxWidth: computed.maxWidth,
              display: computed.display,
            }
          }
          const ancestors = []
          for (let node = element; node instanceof Element && ancestors.length < 12; node = node.parentElement) ancestors.push(describe(node))
          return {
            className: typeof element.className === 'string' ? element.className : null,
            width: rect.width,
            right: rect.right,
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
            maxWidth: style.maxWidth,
            widthProperty: style.width,
            hasImageSlot: element.querySelector('img,[data-slot*="image"]') !== null,
            directChildren: [...element.children].slice(0, 12).map(child => {
              const childRect = child.getBoundingClientRect()
              const childStyle = getComputedStyle(child)
              return {
                tag: child.tagName,
                className: typeof child.className === 'string' ? child.className : null,
                dataSlot: child.getAttribute('data-slot'),
                rect: { left: childRect.left, right: childRect.right, top: childRect.top, bottom: childRect.bottom, width: childRect.width, height: childRect.height },
                width: childStyle.width,
                maxWidth: childStyle.maxWidth,
                display: childStyle.display,
                hasImageSlot: child.querySelector('img,[data-slot*="image"]') !== null,
              }
            }),
            ancestors,
          }
        })
        .sort((left, right) => right.width - left.width)[0]
      const conversationRect = conversation?.getBoundingClientRect()
      return {
        conversationWidth: conversationRect?.width ?? null,
        bubble: bubble === undefined ? null : {
          ...bubble,
          ratioOfConversation: conversationRect?.width ? Number((bubble.width / conversationRect.width).toFixed(4)) : null,
        },
      }
    })
    saNarrowProbeReceipt.readbacks = {
      deepLink: row.deepLink,
      state,
      acceptance: {
        longBubbleAtLeast200: state.bubble?.width >= 200,
        noHorizontalOverflow: state.bubble?.scrollWidth <= state.bubble?.clientWidth + 1,
      },
    }
    if (process.argv.includes('--check-sidebar-toggle')) {
      saNarrowProbeReceipt.scope.push('one reversible native left-sidebar expansion/collapse with5s bounded state observation')
      saNarrowProbeReceipt.readbacks.sidebar = await checkExpandedSidebarOverflow(page)
      saNarrowProbeReceipt.readbacks.sidebarRestored = true
    }
    if (process.argv.includes('--include-settings')) {
      saNarrowProbeReceipt.scope.push('read-only Settings geometry; no configuration writes')
      await page.setViewportSize({ width: 1440, height: 900 })
      await expandLeftNativeSidebar(page)
      await page.getByRole('button', { name: '设置', exact: true }).click()
      const settings = page.getByRole('dialog').filter({ hasText: '群聊与账号' }).first()
      await settings.waitFor({ state: 'visible', timeout: 15_000 })
      try {
        const readback = await readSettingsAuthAndManageableRooms(context)
        await checkAgentSettings(page, settings, row, readback, { scope: 'public/readability/settings' })
      } catch (error) { saNarrowProbeReceipt.readbacks.settingsFailure = redacted(error) }
      saNarrowProbeReceipt.readbacks.settings = row.settingsSection
      await page.keyboard.press('Escape')
    }
    saNarrowProbeReceipt.passed = true
  } catch (error) {
    saNarrowProbeReceipt.readbacks ??= { deepLink: row.deepLink }
    saNarrowProbeReceipt.error = redacted(error)
    process.exitCode = 1
  } finally { await closeBrowserContext(context, 'SA narrow probe context close') }
}

const runSaFilesDialogsProbe = async browser => {
  const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1440, height: 900 } })
  let page
  let row
  try {
    const session = await loginPublic(context, 'super-admin')
    const room = session.rooms.find(item => item.title === '全国可飞')
    assert.ok(room, 'SA Files top-layer probe: 全国可飞 missing')
    page = await context.newPage()
    row = { role: 'super-admin-files-top-layer-probe' }
    await openExistingRoom(page, room, row)
    row.files = await openNativeFiles(page)
    for (const name of ['AI 成员', '群管理']) {
      row.currentStage = name
      await page.getByRole('button', { name, exact: true }).click()
      const dialog = page.getByRole('dialog', { name, exact: true })
      row[name] = await ensureTopLayerOverFiles(page, dialog, name)
      await page.keyboard.press('Escape')
      await dialog.waitFor({ state: 'hidden', timeout: 10_000 })
    }
    saFilesDialogsProbeReceipt.readbacks = { files: row.files, topLayer: { AI: row['AI 成员'], group: row['群管理'] } }
    saFilesDialogsProbeReceipt.passed = true
  } catch (error) {
    saFilesDialogsProbeReceipt.readbacks = {
      currentStage: row?.currentStage ?? null,
      deepLink: row?.deepLink ?? null,
      files: row?.files ?? null,
      dialogSummary: await page?.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].map(element => {
        const rect = element.getBoundingClientRect()
        return { ariaLabel: element.getAttribute('aria-label'), visible: rect.width > 0 && rect.height > 0 }
      })).catch(() => []) ?? [],
    }
    saFilesDialogsProbeReceipt.error = redacted(error)
    process.exitCode = 1
  } finally { await closeBrowserContext(context, 'SA Files dialogs probe context close') }
}

const runSaReconnectProbe = async browser => {
  const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1440, height: 900 } })
  const row = { role: 'super-admin-reconnect-probe', errors: [] }
  try {
    const session = await loginPublic(context, 'super-admin')
    const room = session.rooms.find(item => item.title === '全国可飞')
    assert.ok(room, 'SA reconnect probe: 全国可飞 missing')
    const page = await context.newPage()
    page.on('pageerror', error => recordCompactPageError(row.errors, error))
    await openExistingRoom(page, room, row)
    await checkManualReconnect(page, room, row)
    assert.deepEqual(row.errors, [])
    saReconnectProbeReceipt.readbacks = { deepLink: row.deepLink, reconnect: row.reconnect }
    saReconnectProbeReceipt.passed = true
  } catch (error) {
    saReconnectProbeReceipt.readbacks = { deepLink: row.deepLink, reconnect: row.reconnect }
    saReconnectProbeReceipt.error = redacted(error)
    process.exitCode = 1
  } finally { await closeBrowserContext(context, 'SA reconnect probe context close') }
}

const runSaExactReconnectProbe = async browser => {
  const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1440, height: 900 } })
  const row = { role: 'super-admin-exact-reconnect', errors: [], files: { attempted: false, opened: false } }
  try {
    const session = await loginPublic(context, 'super-admin')
    const room = session.rooms.find(item => item.title === '全国可飞')
    assert.ok(room, 'SA exact reconnect: 全国可飞 missing')
    const page = await context.newPage()
    page.on('pageerror', error => recordCompactPageError(row.errors, error))
    // A single bounded deep-link attempt waits for the current host bootstrap
    // and selection. It never reloads or re-authenticates on a slow response.
    await openExistingRoom(page, room, row)
    row.files.attempted = true
    try {
      row.files = { ...row.files, ...(await openNativeFiles(page)), opened: true }
      if (needsFilesComposerEvidence) await ensureNativeComposerControlGeometry(page, 'super-admin-exact-reconnect/composer', state => { row.files.composerControls = state })
    } catch (error) {
      row.files.error = redacted(error)
    }
    if (row.files.opened) {
      for (const name of ['AI 成员', '群管理']) {
        await page.getByRole('button', { name, exact: true }).click()
        const dialog = page.getByRole('dialog', { name, exact: true })
        row[name] = await ensureTopLayerOverFiles(page, dialog, name)
        await screenshot(page, `RC${release}-public-super-admin-exact-reconnect-${name}.png`, dialog)
        await page.keyboard.press('Escape')
        await dialog.waitFor({ state: 'hidden', timeout: 10_000 })
      }
    }
    await checkManualReconnect(page, room, row)
    assertExactReconnectChecks(row, needsFilesComposerEvidence)
    saExactReconnectProbeReceipt.readbacks = row
    saExactReconnectProbeReceipt.passed = true
  } catch (error) {
    saExactReconnectProbeReceipt.readbacks = row
    saExactReconnectProbeReceipt.error = redacted(error)
    if (reconnectionReceipt.error === undefined && !reconnectionReceipt.passed) reconnectionReceipt.error = redacted(error)
    process.exitCode = 1
  } finally { await closeBrowserContext(context, 'SA exact reconnect context close') }
}

const runSaViewportProbe = async browser => {
  const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1440, height: 900 } })
  try {
    const session = await loginPublic(context, 'super-admin')
    const room = session.rooms.find(item => item.title === '全国可飞')
    assert.ok(room, 'SA viewport probe: 全国可飞 missing')
    const page = await context.newPage()
    const row = { role: 'super-admin-probe', errors: [], geometry: {} }
    page.on('pageerror', error => recordCompactPageError(row.errors, error))
    await openExistingRoom(page, room, row)
    await setStyleAndCheck(page, 'default', 'sa-probe/native/1440')
    await setStyleAndCheck(page, 'qq2007', 'sa-probe/qq2007/1440')
    await checkGallery(page, row, `RC133-public-super-admin-768-gallery-probe.png`, room)
    await page.setViewportSize({ width: 768, height: 900 })
    const style = page.getByRole('combobox', { name: '界面风格', exact: true })
    await waitForVisible(style)
    const details = page.locator('[data-slot="details"]').first()
    const diagnostic = await controlDiagnostic(page, style)
    const detailsState = await details.evaluate(element => ({
      visible: (() => { const rect = element.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 })(),
      filesTextPresent: element.textContent?.includes('Files') === true,
      open: element.getAttribute('data-state') ?? element.getAttribute('aria-expanded'),
    })).catch(() => ({ visible: false, filesTextPresent: false, open: null }))
    const topClip = { x: Math.max(0, Math.floor(diagnostic.rect.left - 80)), y: 0, width: Math.min(240, 768 - Math.max(0, Math.floor(diagnostic.rect.left - 80))), height: 110 }
    await page.screenshot({ path: artifact(`RC${release}-public-super-admin-768-style-probe.png`), clip: topClip })
    saViewportProbeReceipt.readbacks = { deepLink: row.deepLink, gallery: row.gallery, viewport: { width: 768, height: 900 }, style: diagnostic, details: detailsState, errors: row.errors }
    saViewportProbeReceipt.screenshot = `RC${release}-public-super-admin-768-style-probe.png`
    assert.ok(diagnostic.hitIsTarget, 'SA 768 style control center is covered')
    saViewportProbeReceipt.passed = true
  } catch (error) {
    saViewportProbeReceipt.error = redacted(error)
    process.exitCode = 1
  } finally { await closeBrowserContext(context, 'SA viewport probe context close') }
}

const readConnectionState = async page => {
  const status = page.locator('.dsh-chatroom-server-status').first()
  await status.waitFor({ state: 'visible', timeout: 20_000 })
  const readback = await status.evaluate(element => ({
    native: element.getAttribute('data-native'),
    room: element.getAttribute('data-room'),
    notifications: element.getAttribute('data-notifications'),
  }))
  assert.deepEqual(readback, { native: 'connected', room: 'online', notifications: 'online' }, 'native, room, and notification connections must all be ready')
  return readback
}

const checkManualReconnect = async (page, room, row) => {
  const sessionListRequests = []
  const isSessionList = request => new URL(request.url()).pathname.endsWith('/session/list')
  const onRequest = request => {
    if (isSessionList(request)) sessionListRequests.push({ method: request.method(), path: '/session/list' })
  }
  page.on('request', onRequest)
  try {
    const before = await readConnectionState(page)
    const reconnect = page.getByRole('button', { name: '重新连接服务器', exact: true })
    await expectOperable(reconnect, 'super-admin/reconnect')
    const request = await observeDuringAction(() => page.waitForRequest(isSessionList, { timeout: 30_000 }), () => reconnect.click())
    assert.equal(request.method(), 'POST', 'manual reconnect must refresh native session/list through the host request')
    await page.waitForFunction(() => {
      const status = document.querySelector('.dsh-chatroom-server-status')
      return status?.getAttribute('data-native') === 'connected'
        && status.getAttribute('data-room') === 'online'
        && status.getAttribute('data-notifications') === 'online'
    }, undefined, { timeout: 30_000 })
    const after = await readConnectionState(page)
    // The Host's native tree, rather than the plugin's directory-dialog test
    // IDs or a duplicated title button, proves that the pre-existing session
    // survived the reconnect.
    await page.waitForFunction(expected => [...document.querySelectorAll('div[role="treeitem"][aria-selected="true"]')]
      .some(node => node.getAttribute('data-dsh-chatroom-session-id') === expected.sessionId
        && node.textContent?.includes(expected.title) === true),
    { sessionId: String(room.sessionId), title: room.title }, { timeout: 20_000 })
    assert.ok(sessionListRequests.length >= 1, 'manual reconnect must issue a new native session/list request')
    row.reconnect = { oneClick: true, sessionListRequests: sessionListRequests.length, roomStillSelected: true, before, after }
    reconnectionReceipt.readbacks = { sessionListRequests: sessionListRequests.length, roomStillSelected: true, before, after }
    reconnectionReceipt.passed = true
  } catch (error) {
    reconnectionReceipt.error = redacted(error)
    throw error
  } finally { page.off('request', onRequest) }
}

// A bounded isolated-only diagnosis for the Host's narrow left-nav control.
// It performs one reversible click in a fresh guest context and records the
// actual Host controls before/after.  It is deliberately separate from the
// aggregate acceptance run so a geometry investigation cannot overwrite its
// failure receipt.
const runIsolatedNavProbe = async browser => {
  const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1440, height: 900 } })
  try {
    const response = await establishIsolatedNativeLogin(context)
    const identity = await context.request.post(base + prefix + '/session', {
      data: { displayName: 'RC 隔离导航诊断访客', avatarId: 'whale' }, headers: { Origin: base }, timeout: 10_000,
    })
    // The cold profile can already contain the runner's guest identity.  409
    // here is a no-write continuation, not a second identity creation attempt.
    assert.ok([201, 409].includes(identity.status()), 'isolated nav probe identity')
    const page = await context.newPage()
    await page.goto(base, { waitUntil: 'commit', timeout: 15_000 })
    await page.getByRole('combobox', { name: '界面风格', exact: true }).selectOption('qq2007')
    // Match the aggregate run's resize order.  The Host may carry compact-nav
    // state across a resize, so observing only a new 320px page is not enough.
    await page.setViewportSize({ width: 768, height: 900 })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.setViewportSize({ width: 320, height: 720 })
    const settledBefore = await waitForNativeSidebarSettle(page, 320)
    const toggles = page.locator('button[aria-label="展开侧边栏"], button[aria-label="打开侧边栏"]')
    const index = await toggles.evaluateAll(buttons => buttons.findIndex(button => {
      const rect = button.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0 && rect.left + rect.width / 2 < innerWidth / 2
        && !button.closest('[data-dsh-panel="true"]')
    }))
    if (index < 0) {
      isolatedNavProbeReceipt.readbacks = {
        viewport: { width: 320, height: 720 },
        selector: 'button[aria-label="展开侧边栏"], button[aria-label="打开侧边栏"]',
        candidateIndex: index,
        settledBefore,
        controls: await nativeSidebarSnapshot(page),
      }
      await page.screenshot({ path: artifact(`RC${release}-isolated-320-sidebar-hit-probe.png`) })
      isolatedNavProbeReceipt.screenshot = `RC${release}-isolated-320-sidebar-hit-probe.png`
      throw new Error('isolated nav probe left toggle absent after compact sidebar settled')
    }
    const toggle = toggles.nth(index)
    const sidebarState = () => page.evaluate(() => {
      const describe = element => {
        const rect = element.getBoundingClientRect()
        const style = getComputedStyle(element)
        const x = rect.left + rect.width / 2
        const y = rect.top + rect.height / 2
        const hit = document.elementFromPoint(x, y)
        return {
          tag: element.tagName,
          ariaLabel: element.getAttribute('aria-label'),
          title: element.getAttribute('title'),
          text: (element.textContent ?? '').trim().slice(0, 80),
          dataSlot: element.getAttribute('data-slot'),
          rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
          hit: hit?.tagName ?? null,
          hitAriaLabel: hit?.getAttribute('aria-label') ?? null,
          hitIsControl: hit === element || element.contains(hit),
          pointerEvents: style.pointerEvents,
        }
      }
      return {
        viewport: { width: innerWidth, height: innerHeight },
        controls: [...document.querySelectorAll('button')]
          .filter(button => { const rect = button.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 })
          .filter(button => button.getBoundingClientRect().left < innerWidth / 2)
          .map(describe),
        settingsLikeControls: [...document.querySelectorAll('button,[role="button"]')]
          .filter(element => /设置/u.test(`${element.getAttribute('aria-label') ?? ''} ${element.getAttribute('title') ?? ''} ${(element.textContent ?? '').trim()}`))
          .map(describe),
      }
    })
    const before = await sidebarState()
    isolatedNavProbeReceipt.readbacks = {
      viewport: { width: 320, height: 720 },
      selector: 'button[aria-label="展开侧边栏"], button[aria-label="打开侧边栏"]',
      candidateIndex: index,
      settledBefore,
      toggle: await controlDiagnostic(page, toggle),
      before,
    }
    await page.screenshot({ path: artifact(`RC${release}-isolated-320-sidebar-hit-probe.png`) })
    isolatedNavProbeReceipt.screenshot = `RC${release}-isolated-320-sidebar-hit-probe.png`
    await expectOperable(toggle, 'isolated nav probe/320 left toggle')
    await toggle.click()
    await page.waitForTimeout(300)
    const after = await sidebarState()
    isolatedNavProbeReceipt.readbacks.after = after
    isolatedNavProbeReceipt.passed = true
  } catch (error) {
    isolatedNavProbeReceipt.error = redacted(error)
    process.exitCode = 1
  } finally { await closeBrowserContext(context, 'isolated navigation probe context close') }
}

// This probe deliberately stops before guest identity creation.  It proves the
// asset selected by the cold Host and records only the authorization shape that
// controls Settings rendering—never account identifiers, room identifiers, or
// titles.
const runIsolatedAssetAuthProbe = async browser => {
  const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1440, height: 900 } })
  let page
  try {
    const loginResponse = await establishIsolatedNativeLogin(context)
    const identity = await context.request.post(base + prefix + '/session', {
      data: { displayName: 'RC 隔离资源诊断访客', avatarId: 'whale' }, headers: { Origin: base }, timeout: 10_000,
    })
    // A reused cold profile can already retain this runner's ephemeral guest;
    // 409 is therefore a no-write continuation.  No account/auth setting is
    // changed and the resulting page is required only to expose its asset
    // manifest.
    assert.ok([201, 409].includes(identity.status()), 'isolated asset/auth probe identity')
    page = await context.newPage()
    await page.goto(base, { waitUntil: 'commit', timeout: 15_000 })
    // The HTML shell exists at `commit`; its plugin manifest is attached only
    // after the existing Host chrome initializes.  This is a bounded passive
    // wait and does not click or mutate any UI.
    await page.getByRole('button', { name: '设置', exact: true }).waitFor({ state: 'visible', timeout: 20_000 })
    const servedClient = await readServedClientAsset(page, context, { captureName: `RC${release}-isolated-served-client${receiptSuffix}.js` })
    const session = await context.request.get(base + prefix + '/session', { headers: { Origin: base }, timeout: 15_000 })
    const sessionBody = await session.json().catch(() => undefined)
    const manageable = await context.request.get(base + prefix + '/rooms/manageable', { headers: { Origin: base }, timeout: 15_000 })
    const manageableBody = await manageable.json().catch(() => undefined)
    isolatedAssetAuthProbeReceipt.readbacks = {
      nativeLoginStatus: loginResponse.status,
      identityBootstrapStatus: identity.status(),
      servedClient,
      auth: {
        sessionStatus: session.status(),
        enabled: sessionBody?.auth?.enabled === true,
        authenticated: sessionBody?.auth?.authenticated === true,
        accountRole: typeof sessionBody?.auth?.account?.role === 'string' ? sessionBody.auth.account.role : null,
      },
      manageableRooms: {
        status: manageable.status(),
        count: Array.isArray(manageableBody?.rooms) ? manageableBody.rooms.length : null,
      },
    }
    assert.ok(servedClient.exactCandidate, 'served client does not contain the exact immutable candidate asset')
    isolatedAssetAuthProbeReceipt.passed = true
  } catch (error) {
    isolatedAssetAuthProbeReceipt.error = redacted(error)
    process.exitCode = 1
  } finally {
    if (page !== undefined && !page.isClosed()) await bounded(page.close({ runBeforeUnload: false }), 'isolated asset/auth probe page close')
    await closeBrowserContext(context, 'isolated asset/auth probe context close')
  }
}

let browser
try {
  const executablePath = process.env.DSH_CHATROOM_BROWSER_EXECUTABLE_PATH
  receipt.browserEngine = executablePath ? 'explicit executable, fresh temporary profile' : 'bundled Chromium headless shell'
  browser = await chromium.launch({ headless: true, proxy: isolated ? undefined : publicProxy(), ...(executablePath ? { executablePath } : {}) })
  if (memberProbe) {
    await runMemberProbe(browser)
  } else if (saViewportProbe) {
    await runSaViewportProbe(browser)
  } else if (saStyleDomProbe) {
    await runSaStyleDomProbe(browser)
  } else if (saStyleToggleProbe) {
    await runSaStyleToggleProbe(browser)
  } else if (saDeepLinkProbe) {
    await runSaDeepLinkProbe(browser)
  } else if (saContinuationProbe) {
    await runSaContinuationProbe(browser)
  } else if (saFilesProbe) {
    await runSaFilesProbe(browser)
  } else if (saNarrowProbe) {
    await runSaNarrowProbe(browser)
  } else if (saFilesDialogsProbe) {
    await runSaFilesDialogsProbe(browser)
  } else if (saReconnectProbe) {
    await runSaReconnectProbe(browser)
  } else if (saExactReconnectProbe) {
    await runSaExactReconnectProbe(browser)
  } else if (isolatedNavProbe) {
    await runIsolatedNavProbe(browser)
  } else if (isolatedAssetAuthProbe) {
    await runIsolatedAssetAuthProbe(browser)
  } else if (isolated) {
    const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1440, height: 900 } })
    let page
    try {
      const response = await establishIsolatedNativeLogin(context)
      const identity = await context.request.post(base + prefix + '/session', {
        data: { displayName: 'RC133 隔离验收访客', avatarId: 'whale' }, headers: { Origin: base }, timeout: 10_000,
      })
      assert.equal(identity.status(), 201, 'guest identity')
      page = await context.newPage()
      const row = { role: 'guest', rpc: [], errors: [], geometry: {} }; receipt.roles.push(row)
      page.on('pageerror', error => recordCompactPageError(row.errors, error))
      await page.goto(base, { waitUntil: 'commit', timeout: 15_000 })
      await page.getByRole('button', { name: '设置', exact: true }).waitFor({ timeout: 30_000 })
      await checkServedClientBuild(page, context, row)
      row.geometry.native = await setStyleAndCheck(page, 'default', 'isolated/native/1440')
      row.geometry.qq2007 = await setStyleAndCheck(page, 'qq2007', 'isolated/qq2007/1440')
      for (const size of [{ width: 768, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 720 }]) row.geometry[`${size.width}`] = await checkViewport(page, size, `isolated/${size.width}`, '设置')
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.getByRole('button', { name: '设置', exact: true }).click()
      const settings = page.getByRole('dialog').filter({ hasText: '群聊与账号' }).first()
      await settings.waitFor({ state: 'visible', timeout: 15_000 })
      const settingsReadback = await readSettingsAuthAndManageableRooms(context)
      row.settingsReadback = settingsReadback
      await checkAgentSettings(page, settings, row, settingsReadback, { legacyAccountAbsent: true, scope: 'isolated/settings' })
      // Do not leave a native top-layer dialog open while disposing the isolated
      // context; doing so can leave Playwright's close operation unresolved.
      await bounded(page.keyboard.press('Escape'), 'isolated settings dismissal', 10_000)
      await bounded(settings.waitFor({ state: 'hidden', timeout: 10_000 }), 'isolated settings hidden wait', 12_000)
      assert.deepEqual(row.errors, [])
    } finally {
      if (page !== undefined && !page.isClosed()) await bounded(page.close({ runBeforeUnload: false }), 'isolated page close')
      await closeBrowserContext(context, 'isolated context close')
    }
  } else {
    const roleFailures = []
    for (const role of publicRole === undefined ? ['member', 'super-admin'] : [publicRole]) {
      console.log(JSON.stringify({ event: 'acceptance.role.start', role, at: new Date().toISOString() }))
      receipt.activeBrowserOperation = { role, phase: 'newContext', at: new Date().toISOString() }
      await save()
      const context = await bounded(browser.newContext({ locale: 'zh-CN', viewport: { width: 1440, height: 900 } }), 'public test browser context creation', 15_000)
      receipt.activeBrowserOperation = { role, phase: 'login-and-cookie-transfer', at: new Date().toISOString() }
      await save()
      let row
      try {
        const session = await loginPublic(context, role)
        receipt.activeBrowserOperation = { role, phase: 'authenticated', at: new Date().toISOString() }
        console.log(JSON.stringify({ event: 'acceptance.role.authenticated', role, at: new Date().toISOString() }))
        row = { role, rpc: [], errors: [], roomSelected: true, geometry: {} }; receipt.roles.push(row)
        const room = role === 'super-admin'
          ? session.rooms.find(item => item.title === '全国可飞')
          : session.rooms.find(item => item.title === memberAcceptanceRoomTitle && item.id && item.sessionId)
        assert.ok(room, `${role}: no accessible existing room with native session`)
        if (role === 'super-admin') {
          row.mediaRoom = { kind: 'national-fly', preflightItems: await galleryCount(context, room) }
          assert.ok(row.mediaRoom.preflightItems >= 2, '全国可飞 no longer has the required gallery media')
          receipt.anonymousGallery = await assertAnonymousGalleryDenied(browser, room)
        } else row.mediaRoom = { kind: 'owned-accessible-room', contentClaim: 'not asserted' }
        if (role === 'member') await checkMemberDenials(context, room, row)
        const page = await context.newPage()
        page.on('pageerror', error => recordCompactPageError(row.errors, error))
        await openExistingRoom(page, room, row)
        console.log(JSON.stringify({ event: 'acceptance.room.ready', role, at: new Date().toISOString() }))
        // Public acceptance must prove the same browser context received the
        // immutable candidate before interpreting its room/UI behavior.  This
        // remains a GET-only manifest/client read and retains hashes only.
        await checkServedClientBuild(page, context, row)
        row.geometry.native = await setStyleAndCheck(page, 'default', `${role}/native/1440`)
        row.geometry.qq2007 = await setStyleAndCheck(page, 'qq2007', `${role}/qq2007/1440`)
        if (role === 'super-admin') {
          // Each observation below is read-only and can stand on its own. A
          // narrow-layout failure must not hide gallery, Files, or reconnect
          // evidence; the aggregate still fails when any stage does.
          row.stages = {}
          const runStage = async (name, action) => {
            console.log(JSON.stringify({ event: 'acceptance.stage.start', name, at: new Date().toISOString() }))
            try {
              await action()
              row.stages[name] = { passed: true }
            } catch (error) {
              row.stages[name] = { passed: false, error: redacted(error) }
              roleFailures.push(`${role}/${name}: ${redacted(error)}`)
            } finally {
              // Close only dialogs in this owned test page; a failed stage must
              // not leave a modal covering the next independent control.
              try {
                // Inert/aria-hidden dialogs can still be in the top layer;
                // accessibility-role lookup alone can miss an owned blocker.
                const dialogs = page.locator('dialog[open], [role="dialog"]').filter({ visible: true })
                for (let i = 0; i < 3 && await dialogs.count() > 0; i++) {
                  await page.keyboard.press('Escape')
                  await waitForAnimationFrames(page)
                }
                assert.equal(await dialogs.count(), 0, 'stage left an open dialog')
                // Independent stages start at the declared desktop baseline,
                // even if a failed Settings assertion stopped at390px.
                await page.setViewportSize({ width: 1440, height: 900 })
                await waitForNativeSidebarSettle(page, 1440)
              } catch (error) {
                row.stages[name].cleanupError = redacted(error)
                row.stages[name].passed = false
                roleFailures.push(`${role}/${name}/cleanup: ${redacted(error)}`)
              }
              // Preserve partial failures before later stages or driver teardown.
              await save()
              console.log(JSON.stringify({ event: 'acceptance.stage.result', name, passed: row.stages[name].passed, at: new Date().toISOString() }))
            }
          }
          await runStage('qqNarrow320', async () => { await checkHostNarrowMessageGeometry(page, row) })
          await runStage('gallery', async () => { await checkGallery(page, row, `RC133-public-${role}-gallery.png`, room) })
          await runStage('viewports', async () => {
            for (const size of [{ width: 768, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 720 }]) row.geometry[`${size.width}`] = await checkViewport(page, size, `${role}/${size.width}`, '▧ 会话图库')
          })
          await page.setViewportSize({ width: 1440, height: 900 })
          for (const [name, image] of [['AI 成员', 'RC133-public-admin-ai-files.png'], ['群管理', 'RC133-public-admin-group-files.png']]) {
            await runStage(`files-${name}`, async () => {
              row.files = await openNativeFiles(page)
              if (needsFilesComposerEvidence) row.files.composerControls = await ensureNativeComposerControlGeometry(page, `super-admin/${name}/composer`)
              await page.getByRole('button', { name, exact: true }).click()
              const dialog = page.getByRole('dialog', { name, exact: true })
              row[name] = await ensureTopLayerOverFiles(page, dialog, name)
              await screenshot(page, image, dialog)
              await page.keyboard.press('Escape')
              await dialog.waitFor({ state: 'hidden', timeout: 10_000 })
            })
          }
          if (needsManageableRoomsStateEvidence) {
            await runStage('settings-manageable-rooms', async () => {
              await page.getByRole('button', { name: '设置', exact: true }).click()
              const settings = page.getByRole('dialog').filter({ hasText: '群聊与账号' }).first()
              await settings.waitFor({ state: 'visible', timeout: 15_000 })
              const settingsReadback = await readSettingsAuthAndManageableRooms(context)
              await checkAgentSettings(page, settings, row, settingsReadback, { scope: 'public/super-admin/settings' })
              await bounded(page.keyboard.press('Escape'), 'public super-admin settings dismissal', 10_000)
              await bounded(settings.waitFor({ state: 'hidden', timeout: 10_000 }), 'public super-admin settings hidden wait', 12_000)
            })
          }
          if (needsReconnectEvidence) await runStage('reconnect', async () => { await checkManualReconnect(page, room, row) })
          if (row.errors.length > 0) {
            row.stages.pageErrors = { passed: false, count: row.errors.length }
            roleFailures.push(`${role}/pageErrors: ${row.errors.length}`)
          } else row.stages.pageErrors = { passed: true }
        } else {
          await checkEmptyGallery(page, row, `RC133-public-${role}-gallery-empty.png`, room)
          for (const size of [{ width: 768, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 720 }]) row.geometry[`${size.width}`] = await checkViewport(page, size, `${role}/${size.width}`, '▧ 会话图库')
          await page.setViewportSize({ width: 1440, height: 900 })
          for (const name of ['设置', 'AI 成员', '群管理']) assert.equal(await page.getByRole('button', { name, exact: true }).count(), 0, `member must not see ${name}`)
          await page.keyboard.press('Control+,')
          assert.equal(await page.getByRole('dialog', { name: '设置', exact: true }).count(), 0, 'member settings keyboard escape')
          await page.getByRole('button', { name: '我的账号', exact: true }).click()
          const account = page.getByRole('dialog', { name: '我的账号', exact: true })
          await account.waitFor({ timeout: 15_000 })
          await screenshot(page, 'RC133-public-member-account.png', account)
          row.accountModal = await account.evaluate(element => element.matches(':modal'))
          assert.equal(row.accountModal, true)
        }
        if (role === 'member') assert.deepEqual(row.errors, [])
      } catch (error) {
        if (row === undefined) {
          row = { role, rpc: [], errors: [], roomSelected: false, geometry: {} }
          receipt.roles.push(row)
        }
        row.failure = redacted(error)
        roleFailures.push(`${role}: ${redacted(error)}`)
      } finally { await closeBrowserContext(context, `${role} public context close`) }
    }
    if (roleFailures.length > 0) throw new Error(roleFailures.join('\n'))
  }
  if (!memberProbe && !saViewportProbe && !saStyleDomProbe && !saStyleToggleProbe && !saDeepLinkProbe && !saContinuationProbe && !saFilesProbe && !saNarrowProbe && !saFilesDialogsProbe && !saReconnectProbe && !saExactReconnectProbe && !isolatedNavProbe && !isolatedAssetAuthProbe) receipt.passed = true
} catch (error) {
  if (memberProbe) memberProbeReceipt.error = redacted(error)
  else if (saViewportProbe) saViewportProbeReceipt.error = redacted(error)
  else if (saStyleDomProbe) saStyleDomProbeReceipt.error = redacted(error)
  else if (saStyleToggleProbe) saStyleToggleProbeReceipt.error = redacted(error)
  else if (saDeepLinkProbe) saDeepLinkProbeReceipt.error = redacted(error)
  else if (saContinuationProbe) saContinuationProbeReceipt.error = redacted(error)
  else if (saFilesProbe) saFilesProbeReceipt.error = redacted(error)
  else if (saNarrowProbe) saNarrowProbeReceipt.error = redacted(error)
  else if (saFilesDialogsProbe) saFilesDialogsProbeReceipt.error = redacted(error)
  else if (saReconnectProbe) saReconnectProbeReceipt.error = redacted(error)
  else if (saExactReconnectProbe) saExactReconnectProbeReceipt.error = redacted(error)
  else if (isolatedNavProbe) isolatedNavProbeReceipt.error = redacted(error)
  else if (isolatedAssetAuthProbe) isolatedAssetAuthProbeReceipt.error = redacted(error)
  else {
    receipt.error = redacted(error)
    if (!isolated && needsReconnectEvidence && !reconnectionReceipt.passed && reconnectionReceipt.error === undefined) reconnectionReceipt.error = redacted(error)
  }
  process.exitCode = 1
} finally {
  receipt.browserCleanup = { startedAt: new Date().toISOString(), connected: browser?.isConnected(), contextsRemaining: browser?.contexts().length }
  try {
    await bounded(browser === undefined ? Promise.resolve() : browser.close(), 'Playwright browser close')
    receipt.browserCleanup.completedAt = new Date().toISOString()
  } catch (error) {
    // Save a real failed receipt even if a browser/driver teardown regresses;
    // a runner parent will then clean only its own child tree.
    if (memberProbe) memberProbeReceipt.error ??= redacted(error)
    else if (saViewportProbe) saViewportProbeReceipt.error ??= redacted(error)
    else if (saStyleDomProbe) saStyleDomProbeReceipt.error ??= redacted(error)
    else if (saStyleToggleProbe) saStyleToggleProbeReceipt.error ??= redacted(error)
    else if (saDeepLinkProbe) saDeepLinkProbeReceipt.error ??= redacted(error)
    else if (saContinuationProbe) saContinuationProbeReceipt.error ??= redacted(error)
    else if (saFilesProbe) saFilesProbeReceipt.error ??= redacted(error)
    else if (saNarrowProbe) saNarrowProbeReceipt.error ??= redacted(error)
    else if (saFilesDialogsProbe) saFilesDialogsProbeReceipt.error ??= redacted(error)
    else if (saReconnectProbe) saReconnectProbeReceipt.error ??= redacted(error)
    else if (saExactReconnectProbe) saExactReconnectProbeReceipt.error ??= redacted(error)
    else if (isolatedNavProbe) isolatedNavProbeReceipt.error ??= redacted(error)
    else if (isolatedAssetAuthProbe) isolatedAssetAuthProbeReceipt.error ??= redacted(error)
    else {
      // A teardown timeout is a real harness failure: it leaves browser
      // lifecycle cleanup unproven.  The UI stages may already have passed,
      // but the saved aggregate must never contradict its non-zero exit.
      receipt.error ??= redacted(error)
      receipt.passed = false
    }
    process.exitCode = 1
  }
  for (const item of [receipt, memberProbeReceipt, saViewportProbeReceipt, saStyleDomProbeReceipt,
    saStyleToggleProbeReceipt, saDeepLinkProbeReceipt, saContinuationProbeReceipt, saFilesProbeReceipt,
    saNarrowProbeReceipt, saFilesDialogsProbeReceipt, saReconnectProbeReceipt, saExactReconnectProbeReceipt,
    isolatedNavProbeReceipt, isolatedAssetAuthProbeReceipt]) finalizeAcceptance(item, process.exitCode)
  if (memberProbe) await saveMemberProbe()
  else if (saViewportProbe) await saveSaViewportProbe()
  else if (saStyleDomProbe) await saveSaStyleDomProbe()
  else if (saStyleToggleProbe) await saveSaStyleToggleProbe()
  else if (saDeepLinkProbe) await saveSaDeepLinkProbe()
  else if (saContinuationProbe) await saveSaContinuationProbe()
  else if (saFilesProbe) await saveSaFilesProbe()
  else if (saNarrowProbe) await saveSaNarrowProbe()
  else if (saFilesDialogsProbe) await saveSaFilesDialogsProbe()
  else if (saReconnectProbe) await saveSaReconnectProbe()
  else if (saExactReconnectProbe) {
    await saveSaExactReconnectProbe()
    if (needsReconnectEvidence) await saveReconnection()
  }
  else if (isolatedNavProbe) await saveIsolatedNavProbe()
  else if (isolatedAssetAuthProbe) await saveIsolatedAssetAuthProbe()
  else {
    await save()
    if (!isolated && needsReconnectEvidence) await saveReconnection()
  }
  console.log(JSON.stringify(memberProbe
    ? { mode: memberProbeReceipt.mode, version, passed: memberProbeReceipt.passed }
    : saViewportProbe
      ? { mode: saViewportProbeReceipt.mode, version, passed: saViewportProbeReceipt.passed }
      : saStyleDomProbe
        ? { mode: saStyleDomProbeReceipt.mode, version, passed: saStyleDomProbeReceipt.passed }
        : saStyleToggleProbe
          ? { mode: saStyleToggleProbeReceipt.mode, version, passed: saStyleToggleProbeReceipt.passed }
          : saDeepLinkProbe
            ? { mode: saDeepLinkProbeReceipt.mode, version, passed: saDeepLinkProbeReceipt.passed }
            : saContinuationProbe
              ? { mode: saContinuationProbeReceipt.mode, version, passed: saContinuationProbeReceipt.passed }
              : saFilesProbe
                ? { mode: saFilesProbeReceipt.mode, version, passed: saFilesProbeReceipt.passed }
                : saNarrowProbe
                  ? { mode: saNarrowProbeReceipt.mode, version, passed: saNarrowProbeReceipt.passed }
                  : saFilesDialogsProbe
                    ? { mode: saFilesDialogsProbeReceipt.mode, version, passed: saFilesDialogsProbeReceipt.passed }
                : saReconnectProbe
                  ? { mode: saReconnectProbeReceipt.mode, version, passed: saReconnectProbeReceipt.passed }
                  : saExactReconnectProbe
                    ? { mode: saExactReconnectProbeReceipt.mode, version, passed: saExactReconnectProbeReceipt.passed }
                    : isolatedNavProbe
                      ? { mode: isolatedNavProbeReceipt.mode, version, passed: isolatedNavProbeReceipt.passed }
                      : isolatedAssetAuthProbe
                        ? { mode: isolatedAssetAuthProbeReceipt.mode, version, passed: isolatedAssetAuthProbeReceipt.passed }
                        : { mode: receipt.mode, version, passed: receipt.passed }))
}
