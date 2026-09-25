# rc1.33 delivery evidence

Version: `1.5.0-codex.rc1.33`. This record covers the Chatroom plugin only. It does not claim a DeepSeek Harness core change, a schema migration, a source-control release, or a production restart.

## Actual implementation scope

- `src/native-gateway.ts` bounds the authenticated, idempotent `session/list` catalogue read to 30 seconds. The deadline signal reaches the pinned native carrier; the gateway returns `504` after it fires, allowing the browser-side single-flight to be released for a later manual reconnect or refresh. It does not replay writes or paid requests, identify the underlying stall cause, or promise stable network/catalogue behavior.
- `src/client/store.ts` uses `roomNavigationRevision` to reject late room-selection responses after navigation, close, or identity changes.
- `src/room.ts` routes room-AI cancellation through `assertRoomAgentAccess`; in an authenticated deployment the active platform super-admin boundary applies. `tests/room.test.ts` includes the member denial and super-admin acceptance cases.

## Local release and CI evidence

- The production profile overlay currently points its disabled base `chatroom` replacement at the immutable `chatroom-1.5.0-codex.rc1.33/dist/index.js` directory. This is configuration/read-back evidence, not a release or restart claim.
- `RC133-check-ci-r2.log` is the passing full CI receipt: typecheck, 51 unit files / 418 tests, build, and 15 browser files / 66 tests. The aggregate is 66 test files and 484 tests; this is not the unsupported “426” count.
- `RC133-check-ci.log` remains retained as a failed first attempt: 2 files / 5 tests failed. It is not counted as passing evidence.
- `RC133-isolated-browser.json` has `passed: true`, including an isolated cold Host and a served-client manifest receipt with the `roomNavigationRevision` marker. It is isolated-host proof, not public-host acceptance.
- `RC133-connection-audit.json` records observed closes, restarts, and bridge failures with explicit causal limits. It does not establish the cause of the historical 13:34 event, browser recovery duration, or indefinite WAN uptime.

## Current verifier

Run:

```powershell
C:\Program Files\nodejs\node.exe review-artifacts\verify-current-rc133.mjs
```

The script is read-only. It checks local versus immutable `dist/index.js` and `dist/client.js` hashes, the active overlay target and installed package version, the local served client manifest plus rc1.33 marker, health, the passing CI receipt, and isolated/public browser receipts. It emits JSON and exits nonzero unless every required proof has `passed: true`.

## Live acceptance boundary

The current `RC133-public-browser.json` has `passed: false`: it reached the member authorization denials but timed out while waiting for gallery thumbnails. Therefore it is not public browser acceptance, and this record does not claim public multi-role, multi-turn, IAB, provider, image, video, or Enterprise WeChat acceptance.

The public acceptance agent is still running. A later public receipt may replace the failed one only if it records `version: 1.5.0-codex.rc1.33` and `passed: true`; then rerun the verifier. The root task will provide any separate IAB evidence. Until both are read back, those layers remain unverified here.
