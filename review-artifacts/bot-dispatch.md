# Bot dispatch / SSE review

## Fixed in this lane

- A named room AI is first accepted into the existing durable `inputs` receipt table using its own `room + profile` Session id, then fanned out with `Promise.allSettled`. Main-room activation or another profile cannot delay that receipt or serialize delivery. Multiple mentions of the same profile share its native inbox activation and queue normally; only cancel/update/delete invalidates that profile generation.
- Profile routing/prompt/enable changes now cancel the old live execution before releasing it. A late `assistant/message` is projected only while it still belongs to the currently bound profile Agent; cancelled/replaced bindings cannot write a stale shared-room bubble.
- A false SSE `response.write()` remains in Node's native response buffer. A 1 MiB incremental pre-write backlog limit or a 15-second missing-drain timeout removes the client. Final integration adds the initial snapshot's byte length as temporary allowance until drain, so its following presence event does not immediately disconnect an oversized snapshot. This is a pre-write threshold, not an absolute allocation limit or an exactly-once network-delivery guarantee.
- Member snapshots now use participant id as the final ordering tie-breaker, so same-millisecond presence updates cannot make their order nondeterministic.

## Dispatch ordering boundary

`submit()` verifies room membership and reference access, validates/files-persist the durable message, and writes a real `inputs` receipt per named profile before shared main-Session activation/admission. A restart replays profile receipts through the same dispatch. Main-room projection remains serialized afterward; a profile failure does not alter the human message. Cancellation/config changes invalidate generations and erase unclaimed profile receipts; both assistant output and generic failure notices recheck after any awaited main-room activation, preventing late pollution.

## Evidence

- `pnpm vitest run tests/room.test.ts tests/message.test.ts`: PASS, 76 tests.
- `pnpm typecheck`: PASS.
- Regressions gate shared-room activation while proving a named profile already received its prompt, gate room projection while cancelling both a late assistant reply and a failure notice, and hold one profile activation across 16 concurrent mentions to prove one activation, 16 distinct deliveries, no cancellation, and no failed runtime state. This is a mocked-runtime concurrency contract, not provider throughput evidence.
- Regressions cover fallback cleanup for incompatible response doubles plus an actually serialized 2 MiB initial snapshot that returns `false`, survives the following presence event, drains, then loses its temporary allowance. Sustained backlog over 1 MiB after drain still closes the connection. See `sse-final-review.md` for the final integration review.
- `git diff --check`: PASS.

## Not proven locally

- No live provider/browser/real socket run was performed; the backpressure evidence is the Node response contract plus unit doubles.
