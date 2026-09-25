import assert from 'node:assert/strict'

// Verified from the shipped 0.1.5-rc.2 InputBar locale contract; retain rc.1 names.
const actionLabels = ['发送消息', '停止生成', '排队发送', '插话发送',
  'Send message', 'Stop generating', 'Queue message', 'Steer message', '发送', '停止', 'Send', 'Stop']
export const nativeComposerActionSelector = actionLabels.map(label => `button[aria-label=${JSON.stringify(label)}]`).join(', ')
export const isNativeComposerActionLabel = label => actionLabels.includes(label)

/** Register first and settle BOTH bounded operations before the next UI stage. */
export async function observeDuringAction(observe, action) {
  let failed = false
  let firstError
  const capture = promise => promise.catch(error => {
    if (!failed) { failed = true; firstError = error }
    throw error
  })
  const pending = capture(observe())
  const [event] = await Promise.allSettled([pending, capture(Promise.resolve().then(action))])
  if (failed) throw firstError
  return event.value
}

/** An opened Files pane alone does not certify its nested composer/dialog checks. */
export function assertExactReconnectChecks(row, requireComposer) {
  assert.equal(row.files?.opened, true, 'native Files entry was unavailable')
  assert.equal(row.files.error, undefined, 'Files subcheck failed: ' + (row.files.error ?? ''))
  if (requireComposer) assert.ok(row.files.composerControls, 'Files composer geometry evidence is missing')
  for (const name of ['AI 成员', '群管理']) {
    assert.equal(row[name]?.modal, true, name + ' is not modal')
    assert.equal(row[name]?.pointOwnedByDialog, true, name + ' is covered')
  }
  assert.equal(row.reconnect?.oneClick, true, 'manual reconnect evidence is missing')
  assert.equal(row.reconnect?.roomStillSelected, true, 'reconnect lost the selected room')
  assert.deepEqual(row.errors, [])
}

/** A late teardown failure must never leave a green aggregate receipt. */
export function finalizeAcceptance(receipt, exitCode) {
  if (receipt.error !== undefined || (exitCode !== undefined && exitCode !== 0)) receipt.passed = false
  return receipt
}
