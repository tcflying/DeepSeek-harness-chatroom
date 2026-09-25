# rc1.44 settings-layout candidate boundary

Version: `1.5.0-codex.rc1.44` is reserved for a minimal Settings repair in `ChatroomAccountPanels.tsx`, `responsive-styles.ts`, and `styles.ts`. The observed legacy empty AccountCard consumed the left settings column, leaving controls about 12px and stretching the enable switch to about 150px while card padding was absent. The candidate also adds a reviewed runtime-failure evidence boundary across `runtime-diagnostics.ts`, `diagnostics.ts`, `http.ts`, and `runtime-failure-evidence.ts`: RangeError evidence is limited to a fixed signature and allowlisted frame/line-column data; raw messages and URLs are excluded and values are re-sanitized across layers. Source, tests, CI, package, immutable stage, deployment, health, isolated, public, IAB, and reconnect evidence are not yet claimed.

## Retained first-CI failure; r2 passed

`RC144-check-ci.log` is a real, retained failure rather than a passing summary: 55 unit files / 477 tests and typecheck/build completed, then Chromium failed to connect within 60 seconds. Consequently 16 browser files reported no tests and the CI command failed. `RC144-check-ci.exit.json` records the child natural close at `2026-09-12T06:22:30.501Z`, `exitCode: 1`, and `samePackage: true` / `sameSource: true` for the candidate hashes. It is not overwritten by r2.

`RC144-check-ci-r2.log` then passed typecheck/build, 55 unit files / 477 tests, and 16 browser files / 85 tests. Its matching exit receipt naturally closed at `2026-09-12T06:36:24.651Z` with `exitCode: 0`, `samePackage: true`, and `sameSource: true`. The CI gate is therefore met for that unchanged candidate. Immutable, served/health, isolated, public, original-IAB, and reconnect gates remain independent and are not yet claimed.

## Retained rc1.43/rc1.42 limits

rc1.43 is immutable-staged only and is not deployed; production remains rc1.42. Isolated IAB tab 8 could read Settings and exposed the legacy empty AccountCard/layout defect, but that observation is not original-public acceptance. Original-public attempts remained timed out; public same-browser tab tests without a room parameter timed out at 35s, and closing that tab did not clear the original-tab AX timeout. Original tabs 1/4/5 remain retained, and neither normal isolated behavior nor manual recovery establishes a root cause.

The rc144 verifier requires a same-version CI log **and** its child-close receipt with `exitCode: 0` plus source/package hashes, immutable bundle/source-map equality, served and health checks, and independent isolated, public, original-IAB, and reconnect receipts. It must not substitute an isolated IAB result for the original IAB or public failures.
