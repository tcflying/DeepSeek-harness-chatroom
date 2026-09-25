import assert from 'node:assert/strict'
// Run with node --test; this belongs to the acceptance runner, not Vitest.
import { test } from 'node:test'
import { assertExactReconnectChecks, finalizeAcceptance, isNativeComposerActionLabel, observeDuringAction } from './acceptance-result.mjs'

const good = () => ({ files: { opened: true, composerControls: {} },
  'AI 成员': { modal: true, pointOwnedByDialog: true }, '群管理': { modal: true, pointOwnedByDialog: true },
  reconnect: { oneClick: true, roomStillSelected: true }, errors: [] })

test('composer recognition covers the verified Chinese and English submit states, not plugin actions', () => {
  for (const label of ['发送消息', '停止生成', '排队发送', '插话发送', 'Send message', 'Stop generating', 'Queue message', 'Steer message', '发送', 'Send']) assert.equal(isNativeComposerActionLabel(label), true)
  for (const label of ['■ 停止', '＋ 新会话', '发送消息副本', null]) assert.equal(isNativeComposerActionLabel(label), false)
})

test('complete Files, both dialogs and reconnect can pass', () => assert.doesNotThrow(() => assertExactReconnectChecks(good(), true)))
test('an opened Files pane cannot swallow a failed composer check', () => {
  const row = good(); row.files.error = 'send control missing or too small'
  assert.throws(() => assertExactReconnectChecks(row, true), /Files subcheck failed/)
})
test('missing composer evidence and covered dialogs fail closed', () => {
  const row = good(); delete row.files.composerControls
  assert.throws(() => assertExactReconnectChecks(row, true), /geometry evidence/)
  const covered = good(); covered['AI 成员'].pointOwnedByDialog = false
  assert.throws(() => assertExactReconnectChecks(covered, true), /covered/)
})
test('lost selection cannot pass reconnect', () => {
  const row = good(); row.reconnect.roomStillSelected = false
  assert.throws(() => assertExactReconnectChecks(row, true), /lost/)
})
test('late errors and nonzero exit revoke aggregate success without promoting failures', () => {
  assert.equal(finalizeAcceptance({ passed: true, error: 'teardown timeout' }, 0).passed, false)
  assert.equal(finalizeAcceptance({ passed: true }, 1).passed, false)
  assert.equal(finalizeAcceptance({ passed: false }, 0).passed, false)
  assert.equal(finalizeAcceptance({ passed: true }, 0).passed, true)
})

test('network observation registers before the action and returns its event', async () => {
  const order = []
  assert.equal(await observeDuringAction(() => { order.push('observe'); return Promise.resolve('request') }, () => { order.push('click') }), 'request')
  assert.deepEqual(order, ['observe', 'click'])
})
test('a failed action still handles a later page-close rejection', async () => {
  let reject
  const observed = new Promise((_, no) => { reject = no })
  const result = observeDuringAction(() => observed, () => { throw new Error('covered button') })
  await new Promise(resolve => setImmediate(resolve))
  reject(new Error('page closed'))
  await assert.rejects(result, /covered button/)
})
test('network failure is retained even when clicking succeeds', async () => {
  await assert.rejects(observeDuringAction(() => Promise.reject(new Error('network timeout')), () => {}), /network timeout/)
})
test('a failed network waiter cannot leave a late click crossing the stage boundary', async () => {
  let completeClick
  let stageDone = false
  const click = new Promise(resolve => { completeClick = resolve })
  const result = observeDuringAction(() => Promise.reject(new Error('network timeout')), () => click)
  const checked = assert.rejects(result, /network timeout/).then(() => { stageDone = true })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(stageDone, false)
  completeClick()
  await checked
  assert.equal(stageDone, true)
})
