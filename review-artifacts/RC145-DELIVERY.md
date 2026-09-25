# rc1.45 legacy-auth Settings guard candidate

Version: `1.5.0-codex.rc1.45` is a candidate only. It corrects the Settings account-card condition for the actual legacy-auth contract: `enabled=false` with `authenticated=true` must not render an account card. The candidate guard is `enabled && authenticated`, and the browser fixture represents that contract.

## Retained rc1.44 evidence and failure

rc1.44 r2 CI passed typecheck/build, 55 unit files / 477 tests, and 16 browser files / 85 tests. Its child naturally closed with `exitCode: 0` and unchanged source/package hashes. The first CI receipt is retained as a failure: Chromium did not connect in 60 seconds, so 16 browser files ran no tests.

The later rc1.44 isolated run exposed the real defect: a legacy-auth session with `enabled=false` and `authenticated=true` displayed an empty AccountCard because the component only checked `authenticated`. The former browser fixture was a false negative. This isolated failure blocks promotion and is not replaced by the CI result.

## Current boundary

The directory store is implemented: it isolates identity and disposal, surfaces explicit loading/error/empty/manual-retry states, and bounds a read at 15 seconds. Its focused evidence is 16/16 plus typecheck. UI cancellation signals are now passed for hidden, restored, and unmounted views and for status/member-card manual refreshes; focused settings-layout evidence is 12/12 plus typecheck. `RC145-check-ci.log` passed typecheck/build, 56 unit files / 490 tests, and 16 browser files / 85 tests. `RC145-check-ci.exit.json` records `startedAt: 2026-09-12T07:17:48.193Z`, natural close at `2026-09-12T07:18:35.450Z`, `exitCode: 0`, and `sameSource: true`.

`RC145-package-stage.json` passed at `2026-09-12T07:28:16.546Z`: the tarball SHA-256 is `8b54f8e8bb6efb69f1d49a2161afb0b09866470e3eceb1dea82c5add4d0f5596`, and both immutable release directories have matching host/client bundles and source maps. This establishes package and immutable-bundle parity only; it is not an overlay, health, or deployment claim.

Isolated r1 and r2 failures remain retained. r2 reached HTTP `303` with `Set-Cookie`, then Playwright timed out while waiting for the response body. A new-login helper correction is being exercised by r3; r3 has no result yet and must not replace those failures. Deployment, health, isolated, public, original-IAB, and reconnect evidence are unclaimed. Production remains rc1.42.
