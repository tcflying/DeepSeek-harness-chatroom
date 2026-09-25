# RC150 — consistent mobile navigation stack

## Cause and bounded repair

RC149's live `-geometry` receipt proves the native Settings switch was hit by
`DIV.nArs4W_explorerBody` (Files) at390px. It also proves every narrow composer
control was hittable once Host resize settlement was observed, but the expanded
left sidebar's collapse control remained covered. Existing plugin CSS assigned
the native sidebar z-index12 and Files15, while installed dsh-web-all adds a
fixed1050 pseudo-element scrim when navigation is open. The lower sidebar
stack trapped both its collapse control and its nested native Settings.

RC150 changes only the mobile sidebar layer12->1100 and its own clickable
backdrop11->1090 in `src/client/qq2007-styles.ts`, matching the installed
responsive drawer contract. Top-layer management/media dialogs are unaffected.
It does not modify DSH core, the other plugin, auth or global network settings.

Four browser fixtures cover both skins at390/768px with the real conflicting
scrim loaded AFTER plugin CSS, Files open, collapse/backdrop hit-testing and
nested Settings hit-testing. All four failed before the source repair at the
collapse hit assertion. The first post-fix targeted run could not connect to
its test-browser session within60seconds: zero tests ran; it is not a green
result. Its orphaned test Node12440 was terminated after ownership verification.
A distinct full CI run uses a fresh temporary installed-Chrome headless profile
and records its own result, without changing the user's profile or IAB.

That CI passed typecheck,497unit tests and both builds, but its browser phase
failed at `page.goto: net::ERR_ABORTED` on the owned127.0.0.1 Vitest bootstrap
page. No browser tests ran in that phase. The failed Vitest child58612 was
terminated only after process-tree ownership verification; the runner then
recorded exit1 and unchanged source. This is not natural successful cleanup.

The distinct `RC150-mobile-layers-direct.json` bypasses Vitest/Vite only:
fresh installed-Chrome headless page, actual project CSS (unused logo artwork
interpolation excluded), no network/profile/server state. All four two-skin
390/768px cases proved collapse/backdrop/Settings hit success and Settings
unmount; functionalPassed=true. Driver close still exceeded15s, so its overall
passed=false is retained. The bounded CSS release decision relies on current
typecheck/unit/build and these real functional checks, NOT a green full CI.
Public deployed-client acceptance is still required as a separate layer.

## Release boundary

`RC150-PUBLICATION.json` records the actual two-phase overlay replacement:
runtime.stop18:52:40.931Z, runtime.start18:53:24.018Z, local/public ready and
full immutable client payload matches by18:54:10.254Z. Only the selected release
path differs from the exclusive RC149 backup. Servy is Running; native45580
and bridge42372 were not restarted. Package allowlist contains180files;
client hash528d9da157b436cef723ba44302f8e5d9b44d4f12cd91d305f8be330e472d92b.

The first live post-release runner stalled before its authenticated marker,
so `RC150-public-browser-live.json` is an explicit forced-stop failure, not
missing evidence disguised as success. Its exact test Node80032/browser tree
was ownership-checked and terminated. Future newContext/cookie-transfer steps
have15second bounds and contentless phase checkpoints; the distinct `-bounded`
receipt uses a fresh bundled-Chromium context for super-admin UI acceptance.

### Actual RC150 functional closure

`RC150-public-browser-bounded.json` records exact current served-client proof
and passing gallery,320/390/768viewport,Files-open AI/group modal,Settings and
manual-reconnect stages, with no page errors. Gallery used3native thumbnails,
decoded a1024x1536original, navigated previous/next and closed with zero owned
requests in flight or started after close. Reconnect emitted exactly1native
session/list request and retained the selected room; all three connection
layers were online before/after.

Both skins passed desktop/narrow Settings hit geometry: every editable label
at least14px, input controls at least14px desktop/16px phone,390px document
with no horizontal overflow. Current320px composer model/context/send controls
are separately hittable without overlap, and the long message body is208px.

The first bounded run's narrow stage failed only at its immediate post-click
sidebar-restoration assertion. The exact focused
`RC150-public-super-admin-320-narrow-geometry-probe-toggle.json` then used a
bounded5second observation of the native state (no synthetic DOM state change)
and proved sidebarRestored=true,category scrollWidth244/clientWidth244,
message body>=200px and no horizontal overflow. Its driver-close timeout is
still retained; the earlier aggregate remains false. The live924px default
counterexample was not reached by the earlier full stage; existing fixture
coverage is not presented as that missing live step.

`RC150-aggregate-final.json` therefore intentionally remains false: current
package/source maps/overlay/full served payload/health/reconnect pass, but full
CI/browser lifecycle, a fresh isolated RC150 run and the user-paused IAB proof
are not complete. No browser executable, proxy/TUN, native Host runtime or
security setting was changed to force those proof layers green.

### Retained scope boundary

The authorized plugin UI repairs and bounded available readbacks are delivered.
Low-level IAB/TUN recovery remains explicitly declined; deterministic browser
runner lifecycle needs its own recovery before a full-CI/IAB closure claim.
Current catalogue delay is located upstream of the plugin authority filter,
but its initiating native persistence/OS cause lacks a per-operation trace.
No source change, live-runtime monkey-patch, forced restart or cache deletion
was applied to DSH to manufacture such a trace. The historical13:34 initiating
event still lacks the original exit/signal record and cannot be reconstructed
from a later health check. Existing sanitized diagnostics stay enabled; the
previously PAUSED automation was not resumed and is not an active-monitor claim.

After both failed-close receipts were saved, the exact owned `-bounded` test
Node22820 and `-toggle` Node63212 were command-line/parent-verified and their
test trees terminated. They are not natural-exit passes. No shared Codex,
native DSH, origin bridge, user browser profile or other task process was targeted.

Full CI, package, publication and public role checks are independent proof layers. Failed RC149
and test-driver receipts remain retained. TUN and low-level IAB work remain
declined. Native catalogue upstream latency and the historical missing exit
record are not attributed to a CSS issue. No paid generation is replayed.
