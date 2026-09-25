# RC135 host-runtime diagnosis (read-only)

Observed: 2026-09-12 local time.  Scope: the active loopback 3181 Host and
its plugin boundary.  No Host/DSH source, configuration, process, account or
chat content was changed or copied.

## Conclusion

The available evidence does **not** support a room-authorisation, deep-link,
or current `session/list` filtering regression as the reason the original IAB
initially lands on a native welcome page with no Workspace.  The current
evidence instead establishes a recoverable native-directory/resource readiness
failure after reload: after a second reload and dismissal of the test notice,
the IAB's reconnect action restored five native directory entries; a manual
selection then entered the intended native Session successfully, and the
unsent draft remained.  Root cause remains **unknown**.

This is not a claim that every old browser failure is caused by the chatroom
plugin.  The current plugin boundary has no server-side observation that
explains the original IAB's initial Workspace absence, while the Host log
proves only that earlier live swaps left asynchronous plugin callbacks running
after their storage domain had closed.  That is relevant historical risk, not
proof of the present recovery sequence.

## Evidence

1. The active profile overlay points its single replacement `chatroom` entry
   to `plugin-releases/chatroom-1.5.0-codex.rc1.35/dist/index.js`; the prior
   saved overlay pointed to rc1.32.  The loopback listener was alive while
   inspected (PID intentionally omitted from this artifact).

2. A fresh headless platform-super-admin run against the same 3181 origin was
   reported by the requester to complete room selection with HTTP 200 and
   native rendering.  The original IAB then recovered its directory through
   reconnect and manual selection.  Together these distinguish the
   service/authority route from an initially unavailable client-native resource.

3. The active runtime's diagnostic journal records one bounded
   `native.session-list.timeout` at 2026-09-12T00:13:14Z (39,895 ms, HTTP 504)
   and no matching current 401/403 or repeated session-list timeout around the
   reported rc135 IAB symptom.  `src/native-gateway.ts:183-227` converts only
   the idempotent catalogue deadline into 504 and cancels the carrier body;
   it cannot turn a successful request into an empty native Workspace.

4. The current client bootstrap calls `sessions.refresh()` once per
   authenticated identity/connection generation (`src/client/native-session-sync.ts:10-58`),
   and the room guard only clears a native current when the account-authorised
   ownership lookup says it is not accessible (`src/client/index.tsx:272-302`).
   The user reproduced the problem by manually selecting a native row, which
   bypasses the URL deep-link waiter.  Thus rc135 deep-link scheduling is not
   on this failure path.

5. The Host's retained `dsh-chatroom.stderr.log` contains multiple stack traces
   from earlier replacement releases where `ChatroomRuntime.broadcastPresence`
   was invoked after `domain 'chatroom' is closed`, from request close handlers.
   It explicitly identifies release directories through rc1.23.  This is
   direct evidence that a live replacement has previously allowed an old
   runtime callback to outlive disposal.  It is historical evidence, not proof
   that rc135 itself emitted the same exception.

6. The original IAB console reports `dsh-better-sidebar` / `agent-terminals`
   connection-open failures.  That is outside Chatroom's runtime ownership.
   It may be related to the initial missing native resource, but the recovery
   without a DSH restart means it is not sufficient evidence of causality.  The
   production journal also shows several short native peer closures and bridge
   `upstream-close` events; those are transport symptoms, not a room policy
   decision.

## Boundary analysis

* The plugin intentionally creates the native `connection` service through
  `applyNativeConnection()` inside an extended context and suppresses only its
  duplicate `/api` registration (`src/native-platform.ts:31-55`).  It then
  owns the authenticated replacement HTTP and mux routes
  (`src/native-gateway.ts:478-502`).  This preserves the Host's client module
  graph; it does not recreate a browser root, Workspace controller, or native
  Session service.
* The pinned native Session client rebuilds its list on `connection/reset` and
  owns the root list/workspace graph.  Health only proves the server route is
  ready; it cannot prove an already-loaded IAB has completed its initial native
  list/resource convergence.  A detached/mixed module registry is one possible
  explanation, but the present evidence has not distinguished it from a
  transient connection-generation or third-party opener failure.
* The observed `agent-terminals` failure must be fixed or quarantined in that
  third-party plugin.  Chatroom should not swallow it, replace its native
  client services, or modify DSH to mask it.

## Minimal plugin-side hardening proposal

Keep the existing two-phase overlay replacement rule.  If a plugin-side
hardening change is later authorised, add a bounded post-hot-reload native
readiness guard in the Chatroom plugin only:

1. On the first authenticated generation, wait for the native Session list to
   reach `ready` and verify the injected `sessions` and `workspaces` services
   remain defined through that generation.
2. If the generation ends or the expected root service disappears, show a
   plugin-local recoverable "native page requires reload" state and stop
   Chatroom's own list/deep-link work for that generation.  Do not clear host
   sessions, retry writes, manufacture a Workspace, or call third-party
   plugin APIs.
3. Record only a structural diagnostic (generation state and missing-service
   kind; no URL, cookie, account, request body, title or content).  A focused
   test should dispose/recreate the connection generation and assert no stale
   Chatroom callback calls `sessions.refresh()` or `selectRoom()` afterwards.

This would turn an otherwise ambiguous first-load condition into actionable
evidence without widening Chatroom authority.  It does not repair
`dsh-better-sidebar`; that requires an independent plugin
compatibility/disable-and-reload test.  This proposal is not a root-cause fix.

## Next discriminating acceptance (not run)

With an existing original IAB and a fresh IAB side by side, inspect only the
client asset/module generation and native `sessions.list` phase/current before
and after a deliberate overlay two-phase switch.  Correlate first-load
`pending` duration, connection generation, and the third-party opener error
with whether reconnect restores the list.  If the fresh page fails with the
same `dsh-better-sidebar` console error, hand the failure to that plugin; do
not attribute it to Chatroom.
