# rc1.37 delivery evidence

Version: `1.5.0-codex.rc1.37`. This is a partial delivery record for the Chatroom plugin only. Full CI, immutable package/hash, production two-stage overlay, and health read-backs pass; it does not claim a DeepSeek Harness core change, schema migration, source-control release, restart, or full live acceptance.

## Candidate scope

- In a QQ2007 `chatroom-conversation` container at `34rem` or below, the semantic native action rail that contains `.dsh-chatroom-assistant-tools` may wrap. The tools take `flex: 1 0 100%` and `width: 100%` so a native flex-rail sibling cannot collapse them to the observed 24.49px vertical column.
- The compact assistant-action rules are scoped to QQ2007. The default style retains its 320px action label rather than inheriting QQ2007 label hiding or compacting.
- This is layout-only: it does not change native permissions, room selection, reconnect behavior, message submission, paid requests, or the normal wider-container rail.
- Focused visual/source evidence is 14/14 plus `tsc`. It is not full CI, package, stage, or live evidence.

## CI and immutable package evidence

- `RC137-check-ci.log` exited naturally with typecheck/build, 52 unit files / 440 tests, and 15 browser files / 74 tests passing.
- An ignore-scripts pack was staged immutably to the test and production release directories. Both `dist/index.js` and `dist/client.js` SHA-256 values match the local bundles in each staged directory.
- The production two-stage overlay now selects rc1.37. Health reads `200` with diagnostics `{ enabled: true, healthy: true, dropped: 0 }`, and the managed service is Running. This is deployment/health evidence, not full live acceptance.

## Required evidence

- The immutable `client.js.map` must contain both `src/client/qq2007-styles.ts` and `src/client/native-session-sync.ts`, each byte-equal to its local source. The style source must include the <=34rem container rule, the semantic rail wrapping selector, and the tools full-width flex rule. The retry source must retain rc1.36's authentication-epoch guard.
- The immutable `dist/index.js` and `dist/client.js` hashes must equal local bundles. Served-client text must expose both the new stable narrow-rail CSS markers and the retained visible authority/action marker; served text is continuity evidence and does not replace source-map validation.
- `RC137-isolated-browser.json` is passed. The full public-member probe passed. The public super-admin list attempt timed out before selection; its aggregate and manual reconnect receipts remain failed, and neither is promoted to a passing result.
- The original IAB page first showed welcome. After collapsing/expanding navigation and manually selecting the original room, it recovered the room and preserved the draft. The real Files-narrowed 320px centre still rendered the tools at 24.49px (`RC137-IAB-files.png`), so this IAB case is failed. The actual Host did not expose the old `data-time-hover-root`, leaving rc1.37's marker-dependent selector outside the real `[data-turn-tail]` cohort; the earlier fixture did not model that cohort. This does not claim that a marker should have been written.
- Required later receipts are public super-admin room selection, manual reconnect directory refresh, and the real IAB Files-narrowed 320px case. No full live result is currently counted as passing for rc1.37.

## Current verifier

`verify-current-rc137.mjs` is read-only. It exits nonzero until every version-matched evidence layer above passes. Do not run it before the immutable artifacts and receipts exist.
