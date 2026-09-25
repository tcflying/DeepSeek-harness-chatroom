# QQ classic avatars and speaker alignment — 2026-09-10

## Requested scope

Place each message beside its speaker's avatar and replace the previous built-in avatars with the classic QQ-2007-era set. No DSH source edits, database migration, permission changes, additional model calls, Git commit or push were part of this follow-up.

## Implementation and cause

- The pinned Host 0.1.2 uses `userRow > userStack`; the previous styling targeted an absent `data-time-hover-root` attribute. The native stack consequently stayed right-aligned even for other speakers. Structural selectors now follow the actual Host shape and align both the native stack and its bubble toward the speaker. Duplicate native message actions are hidden while the plugin action rail is retained.
- The previous eight avatar IDs remain valid for stored accounts and transcript markers, but render as classic bitmaps. All built-in pickers use 100 local embedded PNGs. Messages, direct peers, room collages, member lists, both AI management surfaces and native mention candidates share the same avatar identity. Existing enterprise account images are preserved, with a safe classic fallback on failure.
- Native mention candidates without `item.icon` contain name and description only. The adapter now inserts and cleans up its own icon container rather than mistaking the description for a member name. A real-structure regression test failed before this fix and passes afterward.
- Source and license boundary: original Tencent bitmaps from `mengkunsoft/QQ2006`, revision `2dce4e47beb9b55494c492a6cf6e2c01eb77dbe3`, files `img/avatar/1.png` through `100.png`. This is the inherited classic set, not an exhaustive QQ2007-specific archive or a 2019 redesign. `NOTICE.md` is included in the package; code MIT does not extend to the artwork.

## Verification

- Broad regression before the final two AI-list avatar replacements: 327/327 unit tests, 49/49 Chromium tests, typecheck and build passed. Browser coverage includes 320, 390, 768, 926 and 1440 px speaker alignment plus all 100 PNGs decoding in a bounded picker.
- Initial broad run caught a stale old-icon expectation; it was updated. A separate WeCom test hit its existing 1-second process-ready timeout under full concurrency, then passed in isolation and in the full run with four workers. No WeCom production code changed.
- Final AI-list replacements: both management surfaces have image-identity assertions; 31/31 focused tests, typecheck, build and scoped diff check passed. Unaffected broad tests were not repeated.
- Public `https://talk.opcvip.net`: final package login 200, rooms 200 (3 accessible rooms for the acceptance account), auth providers 200, logout 204. Existing real conversation was loaded through the in-app browser. Earlier native-message inspection measured exactly 10 px between avatar and bubble for all 6 existing human/AI messages; every image decoded. Native mention candidates for DeepSeek, 验收甲 and 验收乙 each displayed one decoded classic image.
- Local health: HTTP 200, `{ "ready": true }`. Servy `dsh-chatroom` Running, sole 3181 listener `127.0.0.1`, PID 128852.
- Final rc1.5 browser acceptance: both the room AI manager and the account-settings AI list show decoded `qq-7` images for 验收甲 and 验收乙, matching their messages. After closing the test panels, all 6 message gaps remain exactly 10 px, the rendered legacy-avatar-ID count is 0, the draft is empty, and the accepted public tab is retained for the user. No new message was sent.

## Installed artifact

- Final version: `1.5.0-codex.rc1.5`, installed through the existing profile's offline package-manager workflow. No Harness dependency or binary changes.
- Durable package: `C:/Users/datoo/.dsh/plugins-src/deepseek-harness-chatroom-1.5.0-codex.rc1.5.tgz`
- Package SHA256: `05dcf0a151162f63b2185c5896dd03c09e1625bfa0f96120adb92006cbabf7bd`
- Installed `dist/index.js`: `eef4ea7d52048fd5993590f30576ee954f59c0d4653e38c04147568c9cf7f5ab`
- Installed `dist/client.js`: `3047984cb499357658c36fdecc3b7d1c9ec52691fc971d2e066d5bb3c4cb317c`
- Both installed bundles match the local build; the profile manifest and lock point to the durable package, and the third-party notice is present.
- Immediate previous-version backup: `C:/Users/datoo/.dsh/service/backups/integration-1.5.0-codex.rc1.5-Production-20260910-210108`
- Pre-change rc1.3 backup: `C:/Users/datoo/.dsh/service/backups/integration-1.5.0-codex.rc1.4-Production-20260910-204047`
- Install receipts: `avatar-rc1.4-production-install.log` and `avatar-rc1.5-production-install.log` in this directory. Final installer returned exit 0 and reported `CORE_UNCHANGED=True`.

## Evidence boundaries

The intermediate rc1.4 restart briefly returned the explicit starting-up 503 response, then reached ready without another restart or configuration change. The final rc1.5 restart passed its first readiness check. Existing stderr `DomainError: domain 'chatroom' is closed` was last written during the earlier service shutdown, not during final operation; it is not attributed as the cause of startup latency. No claim of permanent uptime or startup-latency root-cause repair is made.

未继续原因：此前已有的窄窗口顶部按钮拥挤、CDN 缓存策略及硬件折叠屏/Safari 验收不属于本次头像和消息对齐变更；下一步：如进入相应专项，再按对应入口处理和验收。本次未改变这些机制，也不以它们否定已完成的头像与对齐验收。
