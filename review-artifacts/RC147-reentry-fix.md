# RC147 activateSession same-stack re-entry fix

## Scope and boundary

This record covers only `ChatroomClientStore.activateSession` synchronous
re-entry.  It does not claim browser, host, package, dist, source deployment,
or production acceptance.  No DSH source, credentials, browser, service, or
package output was changed.

## Reproduction before the fix

The added regression test installs a normal `store.subscribe` listener.  When
the newly selected mapped room is published, that listener immediately calls
`activateSession(selected.sessionId)`, which models a synchronous host Session
projection refresh.  With `document.visibilityState === 'hidden'`, no
`EventSource` can be assigned; this isolates the `set()`-before-`openEvents()`
window.

On the unfixed source, `node node_modules/vitest/vitest.mjs run
tests/client-navigation-races.test.ts` failed both new cases with:

```
RangeError: Maximum call stack size exceeded
```

The second failure's stack contained `activateSession -> set -> subscriber ->
activateSession`.  This is an executed reproduction, not a source-only
inference.

## Repair

`activatingSessionIds` is a same-Session, in-progress latch.  It starts before
the first state publication and is removed in `finally` only after
`openEvents()` returns, covering the additional publishing performed by
`closeEvents()` and `openEvents()`.

It does not suppress another Session: a synchronous choice of B while A is
activating runs B immediately.  Before A can attach a stream after its first
publish, it checks that A is still the active native Session and returns if B
won.  The same check follows `clearUnread()`.  `openEvents()` also rechecks
that its room remains selected after `closeEvents()` and its connecting-state
publication.  When an identity is still required, the identity-prompt
publication is checked before this activation can write its room projection.

`closeEvents()` snapshots the source and watch before publishing its progress
reset.  If a synchronous listener selects B and B installs a stream, the
outer close returns without closing B's newly installed source.  This preserves
the real newer selection rather than treating it as same-Session re-entry.

## Regression coverage and results

- First mapped room in a hidden document: bounded synchronous emissions and no
  room `EventSource`.
- Identity-required room directory: a synchronous B selection from the prompt
  publication remains B and creates no room stream.
- Visible activation where a subscriber selects a genuinely different mapped
  Session: B remains selected and only B's room stream exists; same-B re-entry
  from `openEvents()` / `closeEvents()` is bounded.
- A real B selection from each later publication window: `clearUnread()`,
  `openEvents()` calling `closeEvents()`, and unbound navigation calling
  `closeEvents()`.  Each kept B selected and left only B's stream active.
- Subscriber throw: `finally` releases the latch; a later activation works.
  After `stop()`, a retained room stream `onopen` callback leaves the store
  offline.
- Existing targeted store tests retain the broader closed/late SSE callback
  behavior and hidden-tab stream behavior.

Green checks executed after the repair:

```
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run tests/client-navigation-races.test.ts tests/client-store.test.ts
# 2 files passed, 60 tests passed
```

The repository's `pnpm` wrapper currently prepends `rtk`; this executable is
not on PATH in this shell (`rtk: The term 'rtk' is not recognized`).  The
commands above invoke the installed project binaries directly.  Full CI and
the rc147 version/package work remain explicitly owned by the parent task.
