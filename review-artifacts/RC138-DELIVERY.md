# rc1.38 delivery evidence

Version: `1.5.0-codex.rc1.38`. Source is frozen and deployed. Full CI passed typecheck/build, 52 unit files / 447 tests, and 15 browser files / 75 tests (`RC138-check-ci.log`). Served/health evidence, isolated guest, and the public-member layer passed. This is not full public or IAB acceptance.

## Candidate scope under review

- The UI uses the actual Host's stable `[data-turn-tail]` assistant-slot structure—not a newly written marker—to make the QQ2007 narrow native action rail wrap and give `.dsh-chatroom-assistant-tools` its full row. The older `data-time-hover-root` selector remains a fallback. It also removes the native human-image stack's second 70.2% cap. This targets the rc1.37 original-browser failure where a Files-narrowed 320px centre left the tools at 24.49px.
- `ServerConnectionStatus` receives `sessions.list` from the client integration. A pending catalogue shows syncing/timeout rather than a green connection state; reconnect remains a manual action and does not claim automatic retry.
- Native `session/list` shares a physical header-directory scan only while concurrent requests are in flight and clears it on settlement. Every request has an independent access snapshot and identity authorization; bounded cancellation and cumulative complete/timeout diagnostics are recorded. This does not establish the root cause of the rc1.37 public-super-admin list timeout or claim to close that incident.
- Focused evidence is UI 15/15, status 4/4, backend 123, and `tsc`; full CI passed as above.

## Retained live failures

- The public receipt remains `passed: false`: the member layer selected its room and preserved expected management `403` boundaries, but the super-admin deep-link request did not select a room within the 30-second wait. This is a failed public super-admin selection, not a member-permission regression.
- The original IAB receipt remains `passed: false`: reload preserved the room URL but stayed on Welcome after catalogue responses. Before manual selection restored the room for separate layout inspection, client-store and AgentPreset paths repeatedly raised `RangeError: Maximum call stack size exceeded`. The same capture observed composer model/send overlap. The root re-entry edge and blank-bootstrap cause are not closed here.
- The manual restored-room capture proves only layout and retained draft. It is not deep-link, reconnect, or full IAB recovery. The reconnect receipt remains failed.

## Evidence boundary

rc1.37 evidence remains immutable and version-scoped. rc1.38's failed public-super-admin, IAB, and reconnect receipts prevent promotion. `verify-current-rc138.mjs` remains read-only and will remain nonzero until every version-matched layer passes.
