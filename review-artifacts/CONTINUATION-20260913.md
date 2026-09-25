# Chatroom continuation — 2026-09-13 CST

Scope: user declined TUN / further in-app-browser low-level work and asked to
continue the other chatroom work. No TUN, OS proxy, Codex restart, DSH core,
account policy or provider configuration is in scope. RC147 was already published.
The resumed acceptance exposed two plugin layout defects; their RC148 repair and
subsequent activation evidence are tracked in `RC148-DELIVERY.md`.

## Verified current layers

- Servy `dsh-chatroom`: Running. Local and public plugin health were 200,
  ready, diagnostics enabled/healthy, dropped 0. Origin bridge was 200,
  PID 42372; the plugin journal still uses Host PID 45580. No service restart
  was used to achieve these observations.
- `NATIVE-CATALOGUE-20260913-r2.json`: actual authenticated native RPC through
  loopback / origin bridge / public origin completed in 4201 / 3685 / 2944 ms,
  respectively, with the same 56 account-visible rows. The upstream catalogue
  contained 136 rows before authorization filtering. No titles or row IDs were
  retained. This is a snapshot, not an uptime guarantee.
- `RC147-public-super-admin-exact-reconnect-sep13r3.json`: corrected harness
  passed on the real public RC147 page; Node naturally exited 0. Existing Files
  opened, AI/member-management dialogs were modal and owned their hit points
  above Files, and a single UI reconnect issued one fresh native catalogue
  request. The room remained selected and native/room/notification states were
  connected/online/online before and after. Composer model/context/send controls
  were 128.22×28 / 28×28 / 34×34 pixels, hit-testable and non-overlapping.

## Fixed acceptance defects and retained negative evidence

1. The exact-reconnect harness caught Files composer failures but computed
   success using only `files.opened`. The initial `...-sep13.json` therefore
   contains `passed: true` alongside a failed composer assertion. That aggregate
   is **invalid**; retain its independent reconnect/modal observations only.
   `assertExactReconnectChecks` now requires all subchecks, and
   `finalizeAcceptance` prevents a late error/nonzero exit from leaving a green
   aggregate. The intentionally still-failing `...-sep13r2.json` naturally exited
   1 and proves that this failure can no longer be swallowed.
2. The composer lookup recognized only legacy `发送/停止/Send/Stop`. The shipped
   `dsh-client-ui-conversation` locale/primary-label implementation uses
   `发送消息/停止生成/排队发送/插话发送` and their English equivalents. The r2
   contentless geometry shows the actual 34×34 hit-testable `发送消息` button,
   while the old lookup returned null. The shared lookup now includes verified
   current and legacy labels, and checks every primary action when stop and send
   coexist. No UI/CSS change was needed for this false alarm.
3. The initial standalone catalogue probe omitted the generated RPC `_request`
   argument and sent the public Origin to a loopback Host. Its retained
   `NATIVE-CATALOGUE-20260913.json` is a **probe failure**, not a service failure.
   The corrected request follows the shipped Typert descriptor and same-origin
   checks; r2 is the valid three-path comparison.
4. One shell launch failed to set test-only environment variables because of
   nested PowerShell expansion. It was interrupted, not promoted to evidence;
   subsequent runs set process-local values in Node with unique receipt suffixes.

5. A failed click could leave a separately started `waitForRequest` promise
   unhandled when the page closed. `observeDuringAction` attaches both branches
   before awaiting them. Aggregate stages dismiss only owned visible dialogs
   and save their result incrementally; a failed Settings stage can no longer
   leave a modal blocking the later reconnect check or lose the earlier evidence.

`node --test review-artifacts/acceptance-result.node-check.mjs`: 9/9 passed,
natural exit 0. Its former `.test.mjs` name was inadvertently collected by
Vitest in RC148 CI r1 (497 application tests passed, separate Node suite not
recognized); the separate runner suffix fixes discovery without excluding or
weakening any application tests. That failed CI receipt is retained.

`RC147-public-browser-sep13fullr2.json` naturally exited 1 and retains all stage
results. Member management rejection, 3 gallery thumbnails, 1024x1536 decoded
original, previous/next, zero owned reads after close/hidden, modal hit ownership,
composer geometry and reconnect passed. QQ320 body width162 and Settings editable
label fonts12/13 failed. The contentless `...-sep13detail.json` diagnostic records
the DOM ancestry; its observation success is not a layout acceptance pass.

## Outage attribution remains bounded

Confirmed failure mechanism from the retained 2026-09-12 evidence: native
catalogue dispatch sometimes did not return within 30 seconds; the origin
bridge's own 30-second header deadline could return 502 before the plugin's
structured 504. Other samples spent substantial time in authorization filtering.
Current successful samples do not establish which persistence operation stalled,
why it stalled, or whether every past disconnect had the same cause.

Read-only Host source inspection confirms that browser `ISessions.refresh()`
reuses `listInflight`, has no cancellation parameter, and clears that promise
only on settlement (`dsh-api-session-controller`, client sessions manager
`refreshList`). That is a missing browser-side recovery facility, not proof that
the server's past slow read was caused by this single-flight state. The plugin
already bounds its authorized list response. No private Host fields were changed
and no DSH patch was applied.

The historical 13:34 outage trigger still lacks the original process exit/signal
record. In-app-browser acceptance is paused by the user's current scope; these
headless public checks are not IAB proof. Existing journal collection continues;
the prior PAUSED heartbeat is not silently resumed and is not claimed as active
scheduled monitoring. A future discriminating capture needs the request's
native dispatch/persistence/filter stages and bridge timing during the actual
slow read, not another restart or a longer readiness deadline.
