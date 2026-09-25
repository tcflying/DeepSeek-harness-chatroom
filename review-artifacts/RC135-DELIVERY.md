# rc1.35 delivery evidence

Version: `1.5.0-codex.rc1.35`. This record covers the Chatroom plugin only. It records completed CI/package/overlay read-backs and partial live evidence; it does not claim a DeepSeek Harness core change, schema migration, source-control release, production restart, provider-operation result, or full live acceptance.

## Actual implementation scope

- `src/client/qq2007-styles.ts` gives the primary assistant tools and action rail the actual narrow conversation-container width. At the 320px centre-column condition, the rail has `width: 100%` and `min-width: 0`; message-action buttons stay `flex: 0 0 auto` with non-wrapping text, while their `.dsh-chatroom-action-label` is hidden so labels do not break character-by-character.
- The Group automatic-reply helper in `src/client/ChatroomPanels.tsx` now states the current boundary: an authenticated deployment permits only an active platform super-admin, while legacy no-auth mode retains room owner/admin management. The focused UI suite reports 26/26 passing cases, including the authenticated wording; this is not full CI or deployment evidence.
- `src/client/index.tsx` delays a URL room selection until the native directory's first pending-to-ready snapshot has restored the Host current baseline. A current change while pending cancels the URL intent; after readiness, a later real native selection still takes precedence through the existing room-navigation revision guard. The wait unsubscribes on dispose, so no late ready callback runs.
- `scheduleDeepLinkNavigation` preserves an unauthenticated URL intent without selecting; it consumes the intent at most once per ready authenticated identity epoch. Its delayed callback rechecks epoch and participant identity, preventing logout or cross-identity callbacks from selecting a room for another account.
- The rc1.34 768px public-super-admin probe located a Host-layout issue: a native top-right SVG covered the Style selector. `src/client/qq2007-styles.ts` now reserves 64px for the Host bottom-panel toggle at 541–900px, and reserves 40px for the phone right-sidebar toggle at <=540px. It clears hit areas with margins rather than hiding controls or escalating z-index.
- Current focused evidence is 3 files / 16 tests for the directory/deep-link lifecycle scope, `tsc` passing, and 12/12 current `visual-polish` checks for the toggle states. The earlier 15/15 vertical-speaker plus visual result is retained as separate historical evidence, not combined into either current count. None of these focused results is full CI, packaging, staging, or live acceptance evidence.

## Retained rc1.34 boundaries

- `RC134-public-member-deep-link-probe.json` is `passed: true`: an authenticated member had an authorized room, a successful select request, selected native tree item, visible account control and composer. The earlier account/button locator timeout was a harness false negative, not evidence that member permissions were broken.
- rc1.34 remains version-scoped and is not promoted to full public acceptance. `RC134-IAB-live.json` is `passed: false`, recording the 320px Files-narrowed assistant-action character-by-character wrap and deferred deep-link attribution. The rc1.34 public/IAB/reconnect boundary remains unresolved even though the member minimum probe passed.

## Read-back evidence and partial live results

- `RC135-check-ci.log` records a full CI run: 52 files / 437 tests, build exit 0, then 15 Chromium files / 72 tests. Teardown took approximately four minutes; that duration is not a functional failure result.
- Dry-pack and pack produced the immutable `chatroom-1.5.0-codex.rc1.35` package. The staged and production two-stage overlays read back to that package; Host/client bundle hashes agree, its served marker is stable, and health read-back is ready with healthy diagnostics. These are package/served-health facts, not a restart, provider, or indefinite-availability claim.
- `RC135-isolated-browser.json` is `passed: true` in an unauthenticated local guest context. Its Settings surface and layout checks are not public role/authorization evidence.
- Public-member coverage completed room selection, expected management `403` denials, account/modal exposure, gallery empty-state handling, and 320/390/768 Style hit targets. The first super-admin deep-link probe timed out while the selected native tree item was visible; an independent super-admin retry selected the native room. The timeout is not assigned a root cause.
- Later super-admin continuation evidence confirmed three gallery thumbnails, original-image left/right navigation, close with `inflight` at zero, and clickable Style controls at 1440/768/390/320. It does not complete the Files-slot or reconnect cases.
- `RC135-IAB-live.json` remains `passed: false`: the original IAB tab first showed welcome; reconnect plus manual native room selection recovered the room and preserved the unsent draft (see `RC135-IAB-restored.png`). Repeated CDP/kernel control timeouts prevented the 320px Files and 768/390 two-toggle-state cases. This recovery is not root-cause closure and does not replace public/headless coverage.
- The packaged rc1.35 README is a stage-time snapshot. Later working-tree documentation does not alter the immutable directory.

## Retained operational limits

- The historical 13:34 trigger remains unknown: no contemporaneous exit code, signal, or service-control record supports a causal classification. rc1.35 evidence does not backfill it.
- The existing monitoring automation remains `PAUSED`. Diagnostics journal work continues independently; it is not evidence that scheduled monitoring is active or that future failures will be caught.

## Current verifier

The verifier remains unchanged and was not used to turn partial evidence into a pass. It exits nonzero until its version-matched package/overlay/hash/served-health/CI and all isolated, public, IAB, and reconnect receipts pass:

```powershell
C:\Program Files\nodejs\node.exe review-artifacts\verify-current-rc135.mjs
```

The verifier is read-only. It exits nonzero until the local package, immutable overlay and Host/client hashes, served stable marker, health, full CI log, and version-matched isolated/public/IAB/reconnect receipts all pass.

## Live acceptance boundary

Still required are the real-Host Files-narrowed 320px action rail, manual reconnect directory refresh, and the original-browser/IAB 320px Files plus 768/390 two-toggle-state checks. The remaining evidence also must preserve authenticated/legacy automatic-reply boundaries and multi-role authorization. This record makes no claim about provider calls, paid operations, Enterprise WeChat, or indefinite network stability.
