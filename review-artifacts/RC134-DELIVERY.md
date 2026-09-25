# rc1.34 delivery evidence

Version: `1.5.0-codex.rc1.34`. This record covers the Chatroom plugin only. The immutable package is staged and the production two-stage overlay read-back points to it; this is not a DeepSeek Harness core change, schema migration, source-control release, or production-restart claim.

## Actual implementation scope

- `src/client/store.ts` now increments `roomNavigationRevision` during `activateSession` only when `nativeSelectionChanged` is true. Native catalogue/status emissions may repeat the current selection; they no longer cause a valid in-flight `selectRoom` response to be discarded.
- A real native selection change still advances the revision, so the older explicit selection response remains rejected.
- `src/client/native-session-sync.ts` retains one identity/generation-keyed native catalogue pull. The `CHATROOM_RECONNECTED` event from manual reconnect calls its explicit retry; if identity or connection generation changes while a pull is pending, settlement schedules exactly one trailing pull for the new key. Ordinary emissions do not poll or retry the same failed key.
- `src/native-gateway.ts` records a dedicated `native.session-list.timeout` diagnostic with elapsed time and `{ kind: 'TimeoutError', httpStatus: 504 }` when the bounded native catalogue read expires. `scripts/chatroom-health-observer.mjs` includes that event in new failures. This makes the timeout observable; it does not identify its root cause, prove network stability, or replay a write/paid request.
- `src/client/qq2007-styles.ts` applies compact QQ2007 header/composer rules with a `chatroom-conversation` container query on the actual centre conversation column, including when a wide viewport is narrowed by the native Files pane. This is source-level layout behavior, not a live visual-acceptance claim.
- `src/client/MediaGallery.tsx` keeps source preparation separate from paid edit submission: hide/switch/preparation failure releases the edit control and shows a retryable status without sending the prompt. A gallery read error shows its alert/retry path instead of the mutually exclusive empty-gallery state; post-submit receipt uncertainty remains distinct and is never automatically replayed.
- `scripts/chatroom-health-observer.mjs` is outside the packaged plugin. Node fetch does not automatically honor an already-present `HTTPS_PROXY`; when the runtime supports it, the observer re-execs only its child with `NODE_USE_ENV_PROXY=1`, preserving the existing proxy and `NO_PROXY` routing. The resulting public health request returned `200`; no global proxy setting was changed. This is observer transport evidence, not a public authorization or feature-acceptance result.
- `tests/client-navigation-races.test.ts` contains paired same-selection/actual-navigation regressions; `tests/native-session-sync.test.ts`, `tests/native-gateway.test.ts`, `tests/observer.test.ts`, and `tests/media-gallery.test.tsx` cover the bounded follow-up cases. The initial red/green run covered 50 focused tests; it is separate from, and does not inflate, the full-CI count below.

## Read-back evidence and remaining boundaries

- `RC134-check-ci.log` read-back passed: 51 test files / 426 tests, production build, then 15 Chromium files / 67 tests. This is full CI evidence; it is not public multi-role acceptance.
- The immutable `chatroom-1.5.0-codex.rc1.34` package is staged. Production's two-stage overlay read-back selects it; both Host/client bundle hashes match, its served manifest contains the stable rc1.34 marker, and health read-back is ready with healthy diagnostics. These are package/served-health facts, not a restart or provider-operation claim.
- `RC134-isolated-browser.json` is `passed: true`, including the served rc1.34 marker and layout checks. Its mode is unauthenticated local `guest`; the guest Settings surface must not be used as public role/authorization evidence.
- Public multi-role, IAB, and manual `CHATROOM_RECONNECTED` directory-refresh acceptance remain pending. The current public and reconnect draft receipts are not `passed: true`, and no IAB pass receipt is recorded here; none is promoted to passing evidence.
- `RC133-*` remains retained and version-scoped. Its public failure must not be assigned solely to a navigation race: the old harness used a directory-dialog button selector rather than the native `treeitem` session id, current title, and actual gallery room id. The rc1.34 paired red/green navigation regressions establish the selection-race fix independently; neither RC133 evidence nor that unit evidence substitutes for rc1.34 public acceptance.
- The README inside the staged immutable package is its stage-time snapshot. The current README edits postdate packaging and therefore do not alter that immutable directory.

## Current verifier

After replacing the pending public, IAB, and reconnect receipts with version-matched passes, run:

```powershell
C:\Program Files\nodejs\node.exe review-artifacts\verify-current-rc134.mjs
```

The verifier is read-only. It checks the local package version, local versus immutable host/client hashes, active overlay target, served client marker, health, a fresh full-CI log, and version-matched isolated/public/IAB/lifecycle receipts. It prints JSON and exits nonzero until every required layer is demonstrably passed.

## Live acceptance boundary

Remaining work is public multi-role acceptance, original-browser/IAB evidence, and the manual reconnect directory-refresh path. The verifier intentionally does not treat a passing HTTP health response, a pre-rc134 receipt, the isolated guest result, or the 50-test focused run as substitutes for those layers. It makes no claim about provider calls, paid operations, Enterprise WeChat, or indefinite network stability.
