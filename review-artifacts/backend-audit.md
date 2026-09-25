# 后端并发与生命周期审查

范围：`src/routes.ts`、`auth.ts`、`archive.ts`、`domain.ts`、`native-gateway.ts`、`native-platform.ts`、`index.ts`，并沿调用链审阅了 `http.ts`、`room.ts` 和 pinned native mux。

## P1：SSE 慢消费者不受背压约束，可持续占用进程内存

- 证据：`src/room.ts:5039-5060` 中 `writeSse()`、`writeNotificationSse()` 忽略 `ServerResponse.write()` 的 `false` 返回值，且总返回 `true`。`broadcast()`（`3808-3811`）、`notify()`（`2430-2435`）和 `publishDirectMessage()`（`1981-1989`）只在这两个包装函数返回 `false` 时才移除客户端。
- 触发：客户端建立 `/events` 或 `/notifications` 后停止读取，但 TCP 连接未关闭；再持续发送房间状态、消息、反应或私聊事件。
- 机制：Node writable buffer 达到 high-water mark 后 `write()` 返回 `false`，本实现仍继续将所有后续 JSON SSE 帧写入同一连接；没有等待 `drain`、没有有界队列，也没有断开该客户端。每个慢客户端的缓冲量因而无上限。
- 未自愈原因：`close` 监听只会在对端实际断连时删除订阅；缓冲饱和本身既不抛异常，也不会令 `destroyed` / `writableEnded` 为真。
- 最小修复：将 `return response.write(...)` 传回调用方；若返回 `false`，立即 `end()` 并从集合删除该 SSE 客户端。客户端重连会得到房间 snapshot，故这比新增无界队列更安全。若产品必须保证不丢帧，改为每客户端有明确容量的队列并只在 `drain` 后继续。
- 回归：用 `ServerResponse` 替身令 `write()` 返回 `false`，断言 room 和 notification 两条广播路径均删除/结束订阅，随后多次广播不再写入该 response。

## P1：原生 `$events` 授权记录跨逻辑流 generation 残留；并发结果提交存在取用竞态

- 证据：`src/native-gateway.ts:45` 的 `answerable` 以 `clientId:eventId` 保留 waterfall 授权；`261` 收到新的 `$events` `ready` 时直接覆盖单个 socket 闭包中的 `clientId`；`275` 仅在物理 socket close 时清理当时那个 `clientId` 前缀。pinned `node_modules/@deepseek-ai/dsh-api-gateway/lib/types/stream-server.js:115-133` 表明 client 的 logical-stream `cancel` 只 abort 该 stream，不会关闭 socket。
- 触发：在一个 WebSocket 上打开 `$events`（client A）、收到可答复 waterfall 后取消这个 logical stream，再打开 `$events`（client B）；或者长连接持续产生未答复 waterfall。
- 机制：A 的记录不会在 logical-stream cancel 时删除；B 的 ready 覆盖闭包 `clientId` 后，物理 socket close 也只删除 B 的前缀。原记录留在 Map 直到插件卸载。另在当前基线 `95-100` 中，`get()` 后先 `await requireSession()`，记录尚未消费，多个并发 `$events/result` 都可通过检查并被转发。
- 未自愈原因：native Gateway 在收到首个结果后从其 pending delivery 删除，不会保证为旧 generation 补发 cancel；本插件的清理仅依赖其已不可达的 cancel 帧或 socket close。
- 影响边界：pinned Gateway 会忽略重复结果，因此此处是重复 carrier 转发和内存/授权记录泄漏，不是重复执行 provider side effect。
- 最小修复：按 socket/generation 管理记录，在 `$events` generator 的 `finally` 清理该 generation；或至少保留该 socket 全部已见 clientId 并在新 ready 与 socket close 时清理旧前缀。对 `$events/result` 在第一次读取后、任何 `await` 前原子地删除（或标记 in-flight），再继续会话复验与 dispatch。
- 回归：1) 同一 socket A→waterfall→cancel logical stream→B→physical close 后，A/B 记录均不存在；2) `Promise.all` 并发提交同一结果时恰一项为 200、其余 403，且 native dispatch 只发生一次。

## 已检查但未形成缺陷

- `auth.ts` 的账户变更采用 `serializeAccounts()` 串行化；dsh-auth 的周期复验、禁用会话删除和请求身份复验均有可见路径。
- `archive.ts` 的 blob 落盘采用 `wx` 临时文件与 rename，SQLite 启用 WAL/busy timeout；未发现本审查范围内可定位的数据竞争或路径逃逸。
- `index.ts` 的启动失败会 stop runtime，卸载会注销 HTTP/native gateway 并等待启动承诺；未发现可复现的启动/卸载残留。

## 有界验证

执行：`pnpm exec vitest run tests/archive.test.ts tests/native-gateway.test.ts`。

- archive 测试通过。
- native gateway 测试在并行修复中的新并发断言处失败：16 个同一 `$events/result` 均返回 200，而非 1 个 200 + 15 个 403。这与上述 `get()` 后 await 的竞态一致；该测试/修复由另一工作线正在修改，未将其临时失败视作本 lane 的代码改动。
# Integration review addendum (current working tree)

## P1 — Settings-page mutation of a non-active room leaves AI-member controls permanently busy

- Evidence: the settings UI intentionally selects any manageable room and passes `activeRoomId` to profile load/save/delete/cancel (`src/client/ChatroomAccountPanels.tsx:188-210,250-262,308-320`). Store freshness instead requires the *native active room* to equal the target (`src/client/store.ts:305-307`). That predicate gates both clearing `agentBusy` and applying mutation results (`1022-1105`), and the load `finally` uses the same native-room condition (`974-1000`).
- Reproduction: keep native room A active; in Settings select manageable room B; successfully save, enable/disable, delete, or cancel B's agent. The request succeeds and the form can show success, but `agentBusy` remains true and every subsequent AI-agent control is disabled.
- Why it does not self-heal: refreshing B ends with the same false active-room predicate. Only changing the native session happens to reset this store field.
- Minimum repair/test: distinguish a profile-view/operation token from native session identity; clear busy in the owning operation's `finally` and update B when its profile view remains selected. Test active A + managed B mutation succeeds, clears busy, updates B roster, and permits a second operation; include a stale-response no-overwrite case.

## P1 — A cancelled or replaced named agent can still project output already past the first ownership check

- Evidence: on assistant event, `handleSessionEvent` tests the binding/session only once then fire-and-forgets projection (`src/room.ts:2176-2189`). `projectRoomAgentMessage` awaits `ensureRoom()` and then appends/notifies with no source-session, binding, or execution-generation recheck (`3116-3132`). Cancel/update/delete bump generation, remove binding, and cancel/release old agent (`343-355,365-400`).
- Reproduction: an old profile session produces an assistant event which passes the first check; hold `ensureRoom()` pending; cancel, update, or delete profile; release `ensureRoom()`. The old text is appended and notified although the member is no longer entitled to speak.
- Why it does not self-heal: generation guards dispatch runtime updates but is not carried to output projection; the sole binding test precedes an await.
- Minimum repair/test: pass source session or generation into projection and recheck enabled profile + current binding/session + generation after every await before append/notify. Exercise controlled pending `ensureRoom`, cancelling before resolution, and assert no shared-session append or notification; retain one success case.

## Confirmed current mitigations

- Named `@` is no longer behind shared `state.admission`: `submit()` durable-writes per-profile receipts and dispatches them before entering shared `ensureRoom`/main agent work (`src/room.ts:1358-1365,3021-3045`); uncommitted receipts recover through `recoverInputs()` (`3782-3793`). This resolves the originally claimed blocking path.
- SSE currently treats `response.write() === false` as congestion: it closes the response and removes the subscription, allowing reconnect/snapshot instead of buffering indefinitely (`src/room.ts:1791-1801,2001-2006,2450-2455,3866-3869,5097-5130`).
# Status (integration reread): the first two P1 entries below record findings from the initial snapshot. They are now mitigated in the current working tree; see the addendum's “Confirmed current mitigations”. The remaining actionable current findings are the two addendum P1 entries.
# Update after parent integration edit: normal assistant-event projection now passes `sourceSession` and rechecks current binding after `await ensureRoom`, mitigating the second addendum P1's normal-output path. One residual is actionable: `dispatchRoomAgentMentions` catch calls `projectRoomAgentMessage(...failure text...)` without a source session or generation (current `src/room.ts:3106`). It checks generation only before the awaited projection, so cancel/update/delete during that await can still append the late failure notice. Use the same ownership token/predicate for that call and test cancel-before-resolution.

# Final frozen-worktree reread

No remaining P1/P2 was found in the bounded areas reviewed. The historical P1s above are closed in the current tree:

- Named-agent admission is receipt-first (`submit` writes durable profile inputs before shared `state.admission`) and recovery redispatches the receipt. A same-profile re-mention captures the existing generation; only cancel/update/delete bump it, while `agentExecutionCounts` prevents the first queued completion from incorrectly publishing `idle` before the last one. Current source: `src/room.ts:1358-1365,2951-2960,3053-3110`; focused regression: `tests/room.test.ts:2325-2367`.
- Both normal output and fallback failure notice carry a post-await ownership gate. Normal output provides `sourceSession`; failure notice supplies `isCurrent() && runtime.status === 'failed'`, which is re-evaluated after `ensureRoom`. Current source: `src/room.ts:2185-2195,3090-3136`. This closes the addendum's late-projection residual.
- SSE no longer closes immediately on the first `write() === false`, nor silently treats it as success without a limit: every client has a 1 MiB writable-buffer ceiling and one 15-second drain timer; it is removed/destroyed only on ceiling, error, missing drain support, or drain timeout. Events continue through Node's bounded writable buffer rather than an application-side event queue. Current source: `src/room.ts:119-129,182-186,5144-5217`; focused drain behavior: `tests/room.test.ts:568-590`. Unknown/untested in this lane: actual browser/network throughput under sustained production load.
- Store mutation freshness is now keyed to `agentProfilesRoomId` plus `agentBusyGeneration`, not native active room. Target replacement invalidates the prior busy token; mutation/load `finally` clears only its owning token. Current source: `src/client/store.ts:301-345,974-1105`.
- Native `$events` generator `finally` clears its logical client-id authorization keys; `$events/result` rechecks and deletes the exact Map value after async session authorization, before dispatch. Current source: `src/native-gateway.ts:99-105,250-276,341-369`; focused test covers 16 concurrent identical answers (one 200/dispatch) and cancel/reopen on one socket rejects the old client before accepting the new one: `tests/native-gateway.test.ts:230-247`.

No test command was run during this final reread, per the bounded-review instruction; the statements above are static source/test-coverage confirmation, not a fresh execution result.
