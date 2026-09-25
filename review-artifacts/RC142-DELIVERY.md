# rc1.42 private-dialog catalogue-isolation candidate boundary

Version: `1.5.0-codex.rc1.42`. Source is frozen and full CI passed typecheck/build, 54 unit files / 468 tests and 15 browser files / 78 tests (`RC142-check-ci.log`). It addresses a P2 where an ordinary native-Session catalogue update closed an open private-conversation dialog.

## Evidence state

No rc1.42 package, immutable stage, deployment, health, isolated, public, IAB, or reconnect evidence is claimed. The verifier intentionally remains non-passing until immutable bundle/source-map equality, served/health checks, and four independent receipts are present.

## Frozen change

When the selected native Session is unchanged and unbound while no room is active, the store returns before clearing the private-conversation dialog. A real native navigation remains authoritative. This isolates catalogue/status re-emissions; it does not establish or repair a recursion root cause.

## Retained rc1.41 boundary

rc1.41 source was frozen and passed full CI (54 unit files / 467 tests; 15 browser files / 78 tests), then immutable staging with two matching bundle hashes. Its isolated 390px/768px checks passed. Its 320px navigation check failed and remains a suspected Harness resize race, not a root-cause finding. Production remains rc1.39.
