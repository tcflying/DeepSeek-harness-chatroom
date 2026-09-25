# rc1.47 same-session activation re-entry candidate

Version: `1.5.0-codex.rc1.47` is a candidate only. It adds an in-progress latch for synchronous same-session `ChatroomClientStore.activateSession` re-entry. The latch starts before the first state publication and is released after event opening returns.

## Confirmed local behavior

The red-to-green regression reproduces synchronous host-style re-entry through a normal subscriber and then bounds it. A real synchronous selection of a different Session remains active and is not suppressed by the latch. The repair covers three subsequent state-publication windows, plus an additional identity-required prompt synchronously selecting B. Targeted re-entry evidence passed 60/60 plus typecheck.

The AutomationPanel now uses two equal `minmax()` columns, falling back to a single column when narrow. Two geometry checks were red before the repair; `settings-readability` then passed 14/14 plus typecheck. The current full-CI and isolated results are recorded below; neither replaces original-browser acceptance.

## Retained rc1.46 facts and blockers

rc1.46 full CI passed typecheck/build, 56 unit files / 490 tests and 16 browser files / 89 tests; package stage passed with immutable bundle evidence. Its isolated r1 failed while locating native collapsed-sidebar Settings text at 768px, before Settings could run. Original IAB tab 1 retained an AX timeout with native open-panel queued; the tab was not refreshed and its unconfirmed draft was not touched. These remain blockers, not root-cause conclusions.

## Current boundary

RC147 CI r1 naturally exited with 496 unit tests and 93 browser tests, but is stale because the identity-required prompt regression was added afterwards. `RC147-check-ci-r2.log` then passed typecheck/build, 56 unit files / 497 tests and 16 browser files / 93 tests. `RC147-check-ci-r2.exit.json` records `startedAt: 2026-09-12T08:56:08.097Z`, natural close at `2026-09-12T08:56:52.672Z`, `exitCode: 0`, and `sameSource: true`.

- [Package/stage](RC147-package-stage.json): 180 allowlisted package files; the immutable host/client bundles and source maps match the current build in the test and production staging directories. Staging does not activate production.
- [Isolated Host](RC147-isolated-browser.json): cold loopback Host passed the native/QQ skin checks, 768/390/320 viewport checks and settings states/geometry. The wrapper naturally exited 0 and cleaned its owned process tree. The empty legacy AI directory is intentionally not an authenticated administrator-management proof.
- [Actual settings screenshot](RC147-isolated-settings.png): root visually checked the equal model-control widths and single-line save buttons. Original source and all current watched CI inputs remain consistent with immutable source maps.
- [Aggregate](RC147-aggregate.json): remains `passed: false`. Immutable payload, source maps, CI, isolated Host and current production health pass; the production overlay and served client are still rc1.42, not the candidate. Current candidate public/reconnect receipts do not exist. This is explicitly not full production acceptance.

## Retained failure evidence and attribution

The same-stack recursion and four stale-selection publication windows have executable red-to-green regressions. They establish plugin defects, not the initiating cause of every WAN or IAB outage.

RC146 isolated r3 saved `passed: true` with a browser-close timeout and nonzero exit; that inconsistent aggregate must not be counted as a pass. The harness now fails the aggregate on teardown errors and explicitly disposes API request contexts. RC147 closed cleanly; a blank owned-browser process check also left no Chromium child. The original r3 close-timeout trigger remains unconfirmed rather than being inferred solely from the cleanup change.

[Current provider observation](RC147-provider-observation.json) records an OpenCodex PID change, a refusal 2.118 seconds before the new process started, and a subsequent timeout. Current health recovered. The initiating process-exit action is not identified and cannot be used as an IAB root cause. The historical 13:34 trigger likewise lacks its original exit/signal record; see [the retained monitoring boundary](CONNECTION-MONITORING-20260911.md).

[Original IAB](RC147-IAB-live.json): the original tab is discoverable but reports hidden; a viewport screenshot read exceeded 20 seconds and reset the control kernel, following earlier AX timeouts. No draft was edited and no refresh or navigation was forced. A user-visible asynchronous request asks for the existing tab to be expanded without refreshing.

## Unfinished boundary

Production remains rc1.42. The candidate is packaged and isolated-tested, not live-activated. The requested original-page input/session state cannot currently be read; blind live view teardown/reload would not preserve the unconfirmed draft safely or establish user-entry acceptance. No shared browser/profile reset or unrelated service restart was attempted. Resume from the existing original tab when its control route is readable, preserve its draft, then perform the documented two-phase plugin-only activation and current public/original-IAB/reconnect checks. No new source/version/CI cycle is required unless the source changes or those checks reveal a defect.

Plugin diagnostics are writing (`healthy: true`, `dropped: 0`), and the one-shot observer ran at 08:41Z. Native heartbeat `automation-4` is currently PAUSED, not active monitoring; its pause reason is not available. Its existing state was preserved, and the user was asked whether to resume that existing five-minute reminder. No duplicate monitor or paid generation was created.

Only plugin source/builds, immutable staging, test-profile version selection and local evidence were changed. DSH core, production overlay, account/provider credentials, sandbox policy and other web plugins were not modified. No Git commit or push was made.

## Publication update — 2026-09-12 19:32 CST

The preceding sections describe the pre-publication checkpoint and are retained as history. The user subsequently explicitly requested publication. RC147 is now activated in the existing production profile; [publication receipt](RC147-PUBLICATION.json) proves that only the selected immutable release path changed from RC142 to RC147. All other overlay bytes, including account and other-plugin configuration, are unchanged. The rollback snapshot is retained beside the production overlay, outside this repository.

The documented two-phase switch was performed: old runtime stopped at 11:31:49Z and its health route returned 404; the new runtime started at 11:32:21Z. Initial 503 and missing client asset were retained in [initial observation](RC147-aggregate-publishinitial.json), followed by health ready at 11:32:54Z. DSH PID 45580 and origin bridge PID 42372 did not restart; Servy remains Running. [Post-publication aggregate](RC147-aggregate-published.json) verifies current source/immutable bundle equality, actual served full client payload, health, the existing 497 unit / 93 browser CI receipt and isolated Host proof. It deliberately remains failed for missing or failed complete public/original-IAB/reconnect acceptance.

Current public evidence:

- [First public pass attempt](RC147-public-browser.json): the real public member browser loaded the exact RC147 payload, both skins and 768/390/320 layouts passed, five management RPCs returned 403, and personal-account/empty-gallery views passed. The administrator branch stopped on an anonymous-gallery 502 rather than the expected 401. This is a failed aggregate, not a permission leak or a fully accepted release.
- [Second attempt](RC147-public-browser-r2.json): both existing-account login reads timed out in the Playwright API request context; the member response had already returned 200 headers. Both failed runners left owned test processes after writing their receipts, so only their verified process trees were terminated. These are not natural-exit passes and did not restart production or the user's browser.
- [Independent public login transport probe](RC147-public-login-fetch.json): the same administrator authentication endpoint, honoring the existing environment proxy, returned a complete successful response in 1.568 seconds. No credentials, cookie or room content were saved. This separates a working current authentication endpoint from the failed test-client read; it does not establish the cause of every transient error.
- Local Host, local origin bridge and public anonymous gallery requests returned 401 at 11:41:07Z. Earlier ad hoc Node direct-HTTPS ECONNRESET checks did not honor the configured environment proxy and must not be cited as service-down evidence.
- [Focused real-browser attempt](RC147-public-super-admin-exact-reconnect-fetch.json) used the successful public login transport and then normal browser requests. It still failed the original 30-second readiness window: no room selection had completed. The journal recorded `native.session-list.complete` at 11:47:55.100Z, with 20,616 ms upstream, 27,911 ms total and 135 items. This is real catalogue latency, not an established fix. An additional explicitly extended observation is kept separately; it cannot retroactively pass this normal-deadline result.
- [Original IAB after publication](RC147-IAB-live-published.json): the original tab was found, but its AX read again exceeded 20 seconds and reset the control kernel. Its draft, navigation, login and profile were not modified or forcibly refreshed. Public headless checks do not replace that exact surface.

The production plugin diagnostics remain enabled, healthy and without dropped records. A one-shot observer was run at 11:38Z; the previously PAUSED native heartbeat was not resumed implicitly. No new paid image/video request, Git commit/push or npm publication was performed. This is an activated release with explicit acceptance gaps, not a claim that all prior WAN/performance/browser faults have been resolved.

### Final extended observation and scope boundary

[The 60-second observation](RC147-public-super-admin-exact-reconnect-observe.json) also failed, naturally exiting 1 after its owned browser closed. It recorded a native `session/list` POST at 11:53:25.049Z and a 502 response at 11:53:55.520Z; no room selection completed and no reconnect click was possible. This is not merely an undersized test deadline.

Fault attribution is now more specific, but not fully closed: the origin bridge hit its 30-second response-header deadline at 11:53:55.267Z (`ETIMEDOUT`, elapsed 30,005 ms). The plugin's native-list timeout followed at 11:53:55.312Z (`504`, elapsed 30,016 ms), without an upstream response timing. The bridge therefore returned 502 before the plugin could expose its own 504. The initiating reason why the native upstream did not return remains unknown; this does not prove RC147 introduced the delay or that returning to RC142 would remove it. No new Host restart, deadline inflation in production, permission bypass or DSH source change was used to conceal it.

Publication of the specified, previously tested immutable candidate is complete; broad production acceptance and historical root-cause work remain open. Unfinished reason: the original IAB control route repeatedly times out and its draft cannot be safely verified for reload; the native catalogue upstream is timing out and no safe plugin-only corrective mechanism has yet been established. Further rollout changes need a separately validated correction, not an untested mutation of the published immutable release. Next evidence path: trace the native catalogue request inside the pinned Host read-only, preserve the 30-second timeout correlation, and resume exact original-tab acceptance when its supported control route is readable. Retain the existing production rollback snapshot and all failed receipts.
