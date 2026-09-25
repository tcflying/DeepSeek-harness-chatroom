# RC149 — sidebar-footer compatibility

## Confirmed cause

The current public manifest loads `@linxin666/dsh-web-all`. Its installed
`lib/client.js:55157` mobile `RESPONSIVE_CSS` hides every native sidebar child
except the logo when `data-sidebar-collapsed` is present, using `display:none
!important`; the sidebar also has `pointer-events:none`. The current native
Host nests both footer actions and the open Settings modal inside that footer.

`RC148-public-super-admin-320-narrow-geometry-probe-detail4.json` records the
actual computed-style match: native footArea was display:none, no inline style,
no hidden attribute and no chatroom hidden markers. Its descendants, including
the native Settings panel, were0x0. This distinguishes the third-party selector
collision from authorization, an input font problem, or a general IAB diagnosis.

## Plugin-only repair

`src/client/responsive-styles.ts` restores display/flex/pointer access only for
the footer containing the chatroom connection status or plugin Settings. It
keeps that footer at the bottom. It does not remove/disable the other plugin,
restore unrelated sidebar regions, patch Host source or mount a Settings
component that platform authorization has removed.

Two real-browser fixtures embed the exact conflicting selector AFTER the
chatroom styles, matching the risky load-order case. At390/768px both were red
(`none` instead of`flex`); after the fix all43 related browser checks passed,
including footer bottom/hit geometry, visible nested settings and the hidden
unrelated-region negative. Existing member authorization tests remain unchanged.

## Evidence boundaries

RC149 was activated using the existing two-phase overlay on September13,
02:25–02:29CST. `RC149-PUBLICATION.json` records the old runtime.stop, new
runtime.start, intermediate404/502/503, subsequent ready200, and exact full
client payload equality on both loopback and the public domain. Only the
release path differs from the exclusive RC148 rollback backup. Host45580 and
bridge42372 are unchanged; Servy still reports Running. Initialization took
longer than30seconds; that observation is retained, not a fast-start claim.

`RC149-check-ci.exit.json` records natural exit0, unchanged source,497unit
and103browser tests. `RC149-package-stage.json` proves both immutable copies
and the180-file allowlist. Client SHA256 is
`4a1963150189006821b0e238fc235997bab5129e345711d2f550d8ae97c45808`.
The server bundle is byte-identical to RC148; this release adds only the
footer CSS compatibility repair and its regression fixtures.

Both `RC149-isolated-browser.json` and its `-chrome` alternative completed
the UI checks but failed browser.close after15000ms with zero contexts left.
They remain failed receipts. A public temporary-CSS probe on RC148
(`RC148-public-super-admin-320-narrow-geometry-probe-rc149chrome.json`)
completed desktop/narrow Settings checks for both skins with no settingsFailure,
but also failed browser.close. This low-risk CSS release relies on the green
source CI and completed functional checks, not a falsely green aggregate.
Actual deployed-RC149 browser checks are separately retained after activation.

### Live readbacks and retained failures

`RC149-public-browser-r1.json` uses the normal30000ms readiness deadline.
Its member pass includes both skins,320/390/768px, no management/Settings
entry or Settings keyboard escape, personal-account modal, and403 for native
settings/describe,credentials/list,session/selectModel,agentPresets/select and
commands/execute. The exact RC149 served payload is recorded in that browser
context. Super-admin failed before room selection at30000ms; this remains a
failure. Its test Node31796 stayed alive after browser-close timeout and was
terminated only after command-line/parent ownership verification; browser
children had already exited. That is cleanup, not a natural-exit pass.

Correlated current diagnostics: native.session-list.complete at18:30:56.234Z
records29292ms total,26124ms upstream,26132ms through JSON, then3160ms more
for authority filtering (153 upstream rows). The browser initiated at
18:30:25.993Z and timed out waiting for room readiness. An earlier member read
took19731ms total,14906ms upstream. These are cumulative stage timestamps,
not independent durations to add. The current host implementation awaits
sessionQuery.listSessions -> persistence.list before merging live sessions
(`dsh-api-session-controller/lib/types/list.js:106`,
`dsh-session-query/lib/index.js:97,282`). This locates the delay outside the
new CSS; it does not establish which persistence/OS operation caused it.

`RC149-public-browser-visual60.json` explicitly uses a60000ms observation
window, not a new production setting or a30000ms pass. Both roles entered the
existing target rooms. Its gallery pass proves thumbnail/original decode,
previous/next, close and zero dialog-owned work after closure. Files-open AI
and group dialogs both passed modal hit tests; viewport overflow tests passed.
It retained failures for narrow model-hit, narrow Settings-switch-hit and
the subsequent reconnect geometry. The last check inherited390px from the
failed Settings stage; subsequent harness changes restore a desktop baseline
between independent stages and wait for native sidebar resize settlement.
No failed receipt was overwritten or promoted. Further hit-element evidence
is recorded under the distinct `-geometry` suffix.

Full CI, immutable package, isolated Host and public layers have separate receipts.
Any temporary RC149-CSS probe on an RC148 page is explicitly marked injected
test CSS, not a deployed-client pass. Historical native-catalogue latency and
test-browser-close timeouts are not attributed to this CSS collision.
The user's rejected TUN/IAB low-level branch remains paused. No paid media
request, global proxy, credentials, other-plugin file or account policy change.
