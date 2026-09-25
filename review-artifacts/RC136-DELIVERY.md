# rc1.36 delivery evidence

Version: `1.5.0-codex.rc1.36`. This is a partial candidate record for the Chatroom plugin only. Its full-CI rerun and package stage/hash check passed; this does not claim a DeepSeek Harness core change, schema migration, source-control release, production overlay, restart, deployment, or live acceptance.

## Candidate scope

- The candidate is limited to explicit manual reconnect retry during a pending native catalogue read. The retry should be coalesced into one trailing pull only after the in-flight read settles.
- Before that trailing pull, the candidate must revalidate the same authenticated identity, connection generation, and authentication epoch. An auth-loss boundary clears the queued retry and its de-duplication state; logout, disposal, identity change, or generation change must discard it, including a same-identity re-login after that auth boundary, which receives only a fresh automatic pull.
- It adds no polling, synthetic catalogue row, permission grant, automatic write replay, or automatic paid-request replay. It does not identify the root cause of a slow catalogue read or HTTP 504.

## Focused source evidence

- The lifecycle-focused suite reports 6/6 passing cases and `tsc` passes. This is source-level evidence only, not the pending full CI, package, stage, or live acceptance result.

## Retained first CI failure and test-only correction

- `RC136-check-ci.log` is retained as the original failed full-CI attempt: two Enterprise WeChat tests timed out; 438 tests passed. Its raw warning identified an unawaited rejection assertion, and the independent fake CLI read/cleanup path could outlive the test. This record does not assign all Windows timing behavior to either observation.
- The authority correction changes `tests/wecom.test.ts` only: the rejection assertion is awaited, concurrent fake CLI reads use independent instances, and cleanup runs in `finally`. The focused WeCom run is 7/7 and `tsc` passes. It is not full-CI, package, stage, or live proof.
- `RC136-check-ci-r2.log` is the authorized complete rerun and exited naturally with typecheck/build, 52 unit files / 440 tests, and 15 browser files / 72 tests passing. The first failed log remains retained rather than overwritten; this CI pass does not prove package, stage, or live behavior.

## Required evidence

- The immutable client source map must contain `src/client/native-session-sync.ts` with source content byte-equal to local `src/client/native-session-sync.ts`. That source must show the queued explicit retry and its lifecycle guards; an old visible UI marker or a minified identifier alone cannot prove the rc1.36 retry guard.
- The immutable package must match local `dist/index.js` and `dist/client.js` hashes. Served UI continuity may retain the rc1.35 assistant-action/authority copy, but that old marker alone cannot prove the rc1.36 retry guard.
- The immutable package stage/hash check passed. `RC136-isolated-browser.json` remains `passed: false`: at 320px the Harness left rail was not expanded, so its Settings locator could not establish the required surface. A later Harness correction has not yet been followed by an rc1.36 isolated rerun. This is a harness-state failure boundary, not a claim that the Chatroom layout fix passed or failed.
- Required later receipts are a rerun of isolated 320px after the Harness correction, production overlay and served health, public multi-role behavior, original-browser/IAB, and manual reconnect directory refresh. Production remains rc1.35; rc1.36 is not deployed.

## Current verifier

`verify-current-rc136.mjs` is read-only. It requires the rc1.36 package/overlay/hash/served-health evidence, the immutable source-map proof, the passing `RC136-check-ci-r2.log` rerun, and passing isolated/public/IAB/reconnect receipts. Do not run it before those version-matched artifacts exist.
