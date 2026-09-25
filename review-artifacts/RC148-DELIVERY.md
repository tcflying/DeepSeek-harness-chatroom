# RC148 — narrow transcript and Settings labels

Scope: continue the remaining chatroom work after the user declined TUN and
further low-level in-app-browser repair. No DSH core, global network, account,
provider, sandbox or other-plugin change. No paid media request or message send.

## Fault attribution and correction

- RC147 public aggregate `RC147-public-browser-sep13fullr2.json` failed two real
  layout checks. Its narrow DOM probe confirms a 264px conversation after the
  native56px rail, 256px scroll content, 24px side paddings and208px participant
  row. The effective max-width correction was already loaded; avatar+gap still
  consumed46px and left a162px body. RC148 uses a plugin-owned container query
  at24rem to place avatar/name above full-width body. Grouped continuations do
  not add a blank identity row; own/other alignment and default-skin flex remain.
- Editable labels outside the AI form retained12/13px. A shared Settings-card
  rule now provides min14px while preserving larger inherited fonts. It does
  not expand normal-user Settings authority or shrink hint/metadata arbitrarily.
- Browser fixtures now include real avatar space/native padding instead of
  forcing a208px column without an avatar. They cover mobile and Files-narrowed
  desktop, own/other, single/end grouping and switching back to default skin.
  Existing actual Settings components are measured across every editable label.

## Evidence and honest failures

- Before CSS fix:12 failed,29 passed; native-layout widths162/164/158/160 and
  eight12px labels reproduced the public defect. After:41/41 passed and natural
  exit0. Screenshots for negative fixtures are retained by Vitest.
- Acceptance-runner unit checks:9/9, natural exit0. The first RC148 CI collected
  the independent node:test file as a Vitest suite and failed with `No test suite
  found`; all497 application tests passed. Renaming to`.node-check.mjs` preserves
  the separate checks without changing application discovery/configuration.
- RC148 full CI r2, immutable package, isolated Host and actual public acceptance
  are tracked in their own receipts. Do not infer these layers from unit counts.

## Retained boundaries

### Activation and current acceptance — 2026-09-13

- `RC148-check-ci-r2.exit.json`: natural exit0, sameSource=true;497 unit and101
  browser tests. `RC148-package-stage.json`:180 allowlisted files, two immutable
  directories with matching bundles/maps. Server bundle is unchanged fromRC147.
- Isolated r1 completed UI checks but browser.close timed out15s. The wrapper
  cleaned its owned tree. R2's newly suffixed log was initially not used for
  bootstrap, causing an expired-token rejection; it is a harness failure, not
  production auth evidence. With reader/writer naming aligned, r3 passed and
  browser PID90932 naturally exited0; its context count was0 before closure.
- `RC148-PUBLICATION.json`: only replacement path147→148 changed; all other
  overlay bytes match the exclusive rollback backup. Journal stop/start were
  17:36:59.840Z/17:37:18.353Z; ready200 at17:37:38.194Z. Host45580 and bridge42372
  remained running. `RC148-aggregate-r2.json` verifies full served payload,
  source maps, immutable source equality, health and CI, but remains false for
  public/IAB/reconnect layers.
- Public r1/r2 aggregates remain failed. R2 and `...geometry-probe-detail.json`
  independently record208px bodies/no horizontal overflow and14px editable
  labels. These partial measurements do not promote either aggregate to green.
- Further acceptance corrections: restore the side drawer after measuring it;
  wait for BOTH bounded click/network operations to settle before the next
  stage; preserve the first error; catch inert top-layer dialogs using DOM
  rather than only accessibility roles; scroll an editable switch into view
  before hit testing. Default skin intentionally hides action text below640px,
  so its counterexample now uses a924px viewport with a narrow Files conversation.
  Separate acceptance runner checks are now10/10, natural exit0.
- Failed public r1/r2/detail browser closes left only their owned Node processes;
  verified test roots47872/17212/72608 were terminated, and their browser children
  had already exited at cleanup. They are not natural-exit acceptance passes.
- At17:46Z current catalogue reads again took10.4s and24.7s (upstream9.9/19.6s).
  The historic latency mechanism is not closed by this CSS release. The initial
  successful three-path probe must not be advertised as sustained performance.

Historic30s native catalogue timeout attribution remains incomplete: the bridge
could return502 before the plugin504, but the initiating native persistence/read
stall has not been reproduced in this continuation. Three authenticated paths
returned the same56 rows in4.2/3.7/2.9s. Current success is not a root-cause fix.
User-paused IAB/TUN work remains paused; headless public Chromium is not IAB proof.
Existing plugin journals remain enabled; the previously PAUSED native heartbeat
is not claimed as active monitoring. No Git commit/push or npm registry publish.
