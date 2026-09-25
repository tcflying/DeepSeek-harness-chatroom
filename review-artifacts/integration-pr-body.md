## Scope

Integrate the plugin-only development branch as `1.5.0-codex.rc1.3` on top of the existing room AI participant work. This PR targets the personal fork, not upstream. Harness remains pinned to `0.1.2-rc.1`; no Harness source changes or manual database edits are involved.

- Durable, independent named-agent delivery; account/room-scoped client ownership and bounded roster/SSE recovery.
- Cancel/update activation and retirement barriers, including immediate re-mention and late-result filtering.
- Sign-out, account controls and room permission boundaries.
- Phone/foldable container layouts, accessible composer controls and synchronized published bundles.

## Verification

- `pnpm run check:ci`: 323 unit tests and 43 Chromium browser tests passed; type checking and production builds passed.
- New gated activation and gated-dispose regressions failed before the fixes and passed afterward.
- Independent read-only review: both reported P1 races resolved; no remaining confirmed blocker in the reviewed changes.
- Packaged file list inspected; local collaboration records, credentials, databases and review artifacts are excluded.

Browser tests use controlled fixtures. They are not proof of live-provider throughput, every physical foldable device, or production browser acceptance. Production installation and public CDN verification are separate deployment checks.
