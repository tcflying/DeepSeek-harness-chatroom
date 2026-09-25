# rc1.46 manageable-room directory status-card reload target

Version: `1.5.0-codex.rc1.46` is reserved after the immutable rc1.45 package. Its scope is limited to enlarging the **AI manageable-room directory status-card** reload click target exposed by the rc1.45 isolated r3 run. It is not a connection-status card.

## Retained rc1.45 proof and failure

rc1.45 full CI passed typecheck/build, 56 unit files / 490 tests, and 16 browser files / 85 tests; its child naturally exited with `exitCode: 0` and unchanged source. Package stage also verified the tarball and matching host/client bundles plus source maps in two immutable release directories.

These checks do not replace rc1.45 isolated failures. r1/r2 remain retained; r2 reached `303 Set-Cookie` and Playwright then timed out waiting for the response body. Isolated r3 exposed the too-small reload target on the AI manageable-room directory status card. No root-cause closure follows from the proposed hit-target correction.

## Current boundary

`RC146-check-ci.exit.json` records a natural `exitCode: 0` at `2026-09-12T08:03:40Z`: typecheck/build, 56 unit files / 490 tests, and 16 browser files / 89 tests passed. Package stage passed at `2026-09-12T08:05:35Z`. These are CI and package-stage facts only. The README wording correction names the AI manageable-room directory status card accurately in the working tree; it does not rewrite the already-packaged immutable README snapshot.

Isolated r1 remains failed: at 768px, locating the native collapsed-sidebar Settings text timed out before Settings could be exercised. A harness correction is in progress; this result is not a Settings pass. Original IAB tab 1 again hit a 20-second AX timeout, while the requested native open-panel action remained queued. The tab was not refreshed, and the unconfirmed draft was not touched. This is a blocker, not a root-cause conclusion.

Deployment, health, isolated acceptance, public, original-IAB, and reconnect results remain unclaimed. Production remains rc1.42.
