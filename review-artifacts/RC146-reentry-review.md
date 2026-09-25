# RC146 re-entry review (source-only)

## Verdict

One current **source-supported hypothesis** for a stack-overflow mechanism
remains in the `syncSession` / native-session projection path.  It is
independent of the historical timestamp and does not rely on a timeout.  Its
executable minimal reproduction has not been run in this review, so it remains
pending that proof layer.  No separately confirmed same-stack recursion was
found in the sidebar DOM observer,
`native-identity-sync.ts`, or `native-session-sync.ts`.

The current package source identifies itself as `1.5.0-codex.rc1.46`; the
delivery record still says production is rc1.42.  This review makes no
deployment or browser-acceptance claim.

## Source-supported re-entry hypothesis: `activateSession` publishes before its latch exists

### Pending executable reproducer shape

1. Arrange a selected native Session that maps to a room while no room event
   source has yet been assigned (first selection, a hidden document, or the
   interval before `openEvents()` assigns `this.eventSource`).
2. Have the host's session projection synchronously re-emit the current list
   when a client-store listener runs.  The retained IAB evidence names that
   concrete subscriber as `ClientSessions.projectList`.
3. Run `syncSession` through the normal `sessions.list.subscribe(syncSession)`
   path.

`reconcileSession()` calls `store.activateSession()` in
`src/client/index.tsx:283-316`.  For the selected mapped room,
`activateSession()` does not take its same-room early return while
`this.eventSource` is still undefined (`src/client/store.ts:1548-1555`).  It
then calls `this.set(...)` (`1560-1584`), and `set()` synchronously invokes
every listener (`2662-2667`).  A host synchronous projection emission invokes
`syncSession` before the original invocation reaches `openEvents(room)` at
`1586`; the nested invocation has the same state and publishes again.  There
is no depth cap or in-progress guard, so this repeats to `RangeError`.

The source path is consistent with, but does not establish causality from, the
retained source-qualified failure receipts `RC138-IAB-live.json` and
`RC139-IAB-live.json`: both record the cycle through `closeEvents ->
activateSession -> syncSession -> client store set ->
ClientSessions.projectList`.  The current diagnostic at
`src/client/index.tsx:314-316` only warns at depth six
(`src/client/session-reentry-diagnostics.ts:49-67`); it continues executing.

### Smallest safe repair direction

Add an in-progress activation/reconciliation guard that remains set across
both the state publication and `openEvents()` setup, so a same-Session
projection emitted by that publication returns without another publication.
Clear it in `finally`.  Do not merely change the same-room condition to call
`openEvents()` earlier: `openEvents()` itself calls `closeEvents()`, which
currently publishes `modelProgress: []` before assigning `eventSource`
(`src/client/store.ts:2371-2381`, `2439-2444`) and can re-open the same window.

Required proof: make the fake native list synchronously re-emit on each
client-store notification, select a mapped Session, and first demonstrate the
unfixed behaviour; then assert the repaired normal call returns with a bounded
emission count (rather than throwing `RangeError`).  Exercise both the normal
first selection and the no-source state; retain a separate real-host test
because the projection behavior is a host integration edge.

## Mechanisms reviewed and not confirmed as this cause

- **Sidebar observer:** it coalesces into a microtask
  (`src/client/sidebar-rooms.ts:123-130`) rather than calling session sync on
  the current stack.  It observes child/text mutations, not attributes
  (`142`), and the unit suite specifically verifies no second-pass child-list
  writes for the branch renderer (`tests/sidebar-rooms.test.ts:353-357`) and
  quiescence after installation (`888-894`).  Its disposer removes both
  subscriptions, disconnects the observer and clears the retry timer
  (`146-161`).  A busy host could still cause repeated *asynchronous*
  reconciliations, but that is not evidence of this stack overflow.
- **Native identity sync:** it clears `credentialsChanged` and records the
  principal before invoking `reconnect()` (`native-identity-sync.ts:13-18`),
  so an immediate same-principal re-emission cannot re-request reconnect.
- **Native session sync:** `refreshPending`, the requested key, and the
  asynchronous `finally` path serialize refreshes (`native-session-sync.ts:25-57`);
  ordinary same-key store/generation emissions are deduplicated (`59-87`).
  It can schedule a later pull for a changed identity/generation, not recurse
  on the active JS stack.
- **Runtime-failure evidence:** `runtime-failure-evidence.ts` only sanitizes
  a browser RangeError after it occurs.  It is diagnostic evidence, not a
  breaker or a proof that rc1.46 is installed in any host.

## Review boundary

No browser, service, credential, source, bundle, or deployment action was
performed.  CodeGraph was used for initial call-surface discovery, but it
reported `sidebar-rooms.ts` changed after indexing; all conclusions above are
from the current on-disk source.  The historical retained IAB receipts support
the named call sequence only; they are not current acceptance evidence.
