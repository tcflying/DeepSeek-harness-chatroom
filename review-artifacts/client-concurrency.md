# Client concurrency review

## Fixed

- A stale `/session?nativeSessionId=` response could outlive logout and a new login. Its old account's Solo access was accepted into the new browser identity. Session generations now discard stale ownership, login/register/join, room-select/create, and lazy room-ensure responses.
- A first-message `/rooms/ensure` response could return after logout and add the old account's Room to the new account's directory. The same generation guard now leaves that promise without a target.
- `agentBusy` was global: a pending Room A roster made Room B's `ensureAgentProfiles()` return without requesting B. Candidate menus could then read A's roster. In-flight loads are now coalesced only by room and generation; results only update their still-active room. The mention provider supplies its candidate room id explicitly.
- Login/logout now clear identity-scoped client projections (SSE, selected room, roster, direct directory/messages, composer and notifications), so no Alice UI state remains while Bob's session loads.
- Existing room and notification SSE handlers already discard callbacks unless their `EventSource` is still current; visibility and stop close both streams. No duplicate-stream change was needed.
- Follow-up P1: `agentBusy` had no operation owner. A response dropped after room/target movement could leave every profile action disabled. Busy now carries a room and monotonically increasing token. Leaving an active room cancels only that room's operation; selecting a new profile target cancels the prior target's operation; an old completion cannot clear a newer operation. Settings can still load/save managed Room A while chat navigation is on Room B because profile-result ownership follows `agentProfilesRoomId`, not `snapshot.room`.

## Evidence

- Red: controlled old-account ownership and room-ensure promises model the pre-fix stale callbacks; the Room B roster case models the pre-fix `agentBusy` early-return. The first implementation typecheck reported `TS2454 Variable 'load' is used before being assigned`; the in-flight record now stores `{ generation, promise }`.
- Green: `pnpm exec vitest run tests/client-store.test.ts tests/agent-mention-source.test.ts tests/native-prompt.test.ts` — 3 files, 45 tests passed.
- Green (before concurrent unrelated edits): `pnpm run typecheck`.
- Follow-up green: the same targeted test command — 3 files, 46 tests passed. Current `pnpm run typecheck` reaches only unrelated `src/room.ts:5141,5146,5168` `TS2412` failures (`Timeout` assigned `undefined`); no owned-file error is reported.

## Remaining unknowns

- No live multi-browser/provider session was exercised; this is unit/type evidence only. Server-side authorization remains the final boundary.
- Existing non-roster reads (direct directory, search, account/admin panels) still use their established per-feature behavior; they were not broadened here because this review reproduced only identity/room/mention races.
- Toast-dismiss and DOM-highlight timers are short-lived and do not retain network ownership; they were not live stress-tested across an account switch.
