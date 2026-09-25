# GPT / M3 image generation repair — 2026-09-11

## Delivery state

**Later incident / recheck:** The morning acceptance below is historical, not continuous-availability proof. At 13:34 GPT/M3 requests failed; the original browser was investigated and three fresh images passed at 14:40–14:43. See [the follow-up incident evidence](IMAGE-RECHECK-20260911.md). The historical transport-outage trigger and permanent prevention of M3 stale-error repetition remain unproven.

**Production image generation, authenticated downloads and inline previews passed. Native Windows shell sandbox identity remains unresolved; these are separate outcomes.**

- Active production plugin: `1.5.0-codex.rc1.14`, loaded through DSH's native live profile overlay from `C:/Users/datoo/.dsh/chatroom-server/profiles/web/plugin-releases/chatroom-1.5.0-codex.rc1.14`.
- Production node PID **76140**, port **3181**, unchanged. Servy `dsh-chatroom` remains running/automatic, SCM runner PID **67568**, `LocalSystem`. No production restart.
- Original profile dependency and node_modules package remain `.11` as rollback base; their manifest is **not** the active version.
- Local and public health returned HTTP 200 / ready:true. Both real image URLs returned **401 without authentication**, on both origins.
- Original in-app browser remains signed in as 本机管理员. Both PNGs decoded inside the production room; QQ2007 and QQ/penguin logo preserved. Viewport override reset and sidebar restored expanded after acceptance.
- No DSH/OpenCodex source, provider credentials, sandbox protection or original startup script changed. Existing dirty work preserved; no commit/push/Goal.

## Fault attribution

### Missing callable image tool

GPT and M3 could converse, but their actual DSH context lacked an output image-generation tool. Vision input and read_image do not create images. The existing OpenCodex images endpoint returned real PNG bytes; changing conversational model configuration alone could not supply a missing callable tool.

The plugin now registers `chatroom_generate_image` through the existing main/branch/named-AI augmentation path. GPT and M3 both invoked it in production. M3 remains the conversational/orchestration model; the configured OpenAI image engine creates pixels. Live acceptance below covers named profiles, not every model/branch combination.

Route preserved: DSH plugin → `http://127.0.0.1:10100/v1/images/generations` → existing OpenCodex **2.49.0** official OpenAI forwarding route. Image model: `gpt-image-2.5-flare`. That route currently uses the official ChatGPT/Codex backend; no third-party image service or newly configured API-key billing account was substituted.

### Plain-text preview and narrow-screen defects

Named-AI replies use a plain-text projection. Markdown image URLs alone did not ensure an inline preview. Version .13 added previews from durable attachment metadata plus authenticated original downloads, hiding only a duplicate Markdown link matching that local PNG.

Production mobile inspection found two further defects, fixed in .14:

1. Native projected text retained trailing blank lines after hiding the preview. Now trailing whitespace is trimmed only when a matching generated-image link is removed. Regression assertion failed before the fix: expected 完成, received 完成 plus two newlines; passed afterward.
2. Download cards used viewport-relative width, overflowing the narrower message column. They now use `width: min(360px, 100%)`, max-width:100%, min-width:0 and border-box. The new browser fixture failed before the fix (348.9px card in a 180px column) and passed afterward in both skins.

### Native Windows shell sandbox — still unresolved

Original production native-tool error:

```text
sandbox mode "workspace-write" is requested but no sandbox backend is usable on this host; refusing to run the command unconfined.
Runner failure: windows-acl-run: CreateRestrictedToken prerequisite failed: no logon SID found among 4 token groups
```

This is a restricted-token prerequisite failure under the current LocalSystem service identity, not evidence of an OpenAI image outage. Restarting the same identity would not create the missing prerequisite. The image tool uses bounded HTTP and does not require shell execution; no sandbox was disabled or bypassed.

A fixed-purpose `NT SERVICE\dsh-sandbox-probe` SCM probe ran the unchanged official DSH ACL sandbox and returned:

```json
{"exitCode":0,"workspaceWrite":true,"outsideWriteDenied":true}
```

Evidence: `C:/Users/datoo/.dsh/service/sandbox-identity-probe-20260911/data/result.txt`. This proves the isolated probe, **not** the production Servy instance.

After the user's continuation, one native RunAs attempt returned **“The operation was canceled by the user.”** No cutover.log was created. Read-only checks: interactive console active in session 1, Appinfo running, EnableLUA=1, administrator consent=5, secure desktop=1. No fresh UAC operational event established why/by whom it was cancelled. No repeated popup or security weakening. The question about whether the user saw the consent window remained unanswered at handoff.

## Actual production provider-backed acceptance

Room: **GPT 与 M3 生图验收 IMAGE-1789082741978**.
Room id: `29f58452-d88b-4495-9aee-03028b49df15`.

The existing 本机管理员 account was added through normal room management so the original browser could inspect the result. No unrelated room messages were modified. An initial helper error parsing an empty 204 logout response was fixed; membership and logout operations had already succeeded.

`check-image-generation-live.mjs http://127.0.0.1:3181` exited 0: real GPT/M3 native tool calls, chat replies, authenticated downloads, decoded PNGs, anonymous denial, test-profile cancellation and logout.

| Conversational route | Actual artifact | Bytes | Decoded size | Elapsed |
| --- | --- | ---: | --- | ---: |
| oc-gpt6-low / gpt-6-astra | IMAGE-1789082741978-0.png — blue circle | 837408 | 1254 × 1254 | 75340 ms |
| minimax-cn / MiniMax-M3 | IMAGE-1789082741978-1.png — red-scarf penguin | 1803708 | 1254 × 1254 | 47536 ms |

Artifacts: `G:/codex-project/dsh-chatroom-next/review-artifacts/`; structured evidence: `IMAGE-1789082741978.json`.

- GPT file id: `2f0179c0-ddae-480b-8d7f-b8661f992ee2`; PNG SHA-256: `612c8e77c854f19b7d482a19f8d6613625566505dc0d5c0c5981f5d06a29c4af`.
- M3 file id: `f175a3ab-c161-4242-a116-7d0afce76ac4`; PNG SHA-256: `fa587057071779de8386233744409b26c31dbce1f870af79e858cdff03351255`.
- Generated inside production DSH, not Codex's image tool or manually injected files.
- Paid generation used .13. The .14 server bundle is **byte-identical**; .14 only changes the client projection/layout and documentation. Existing production PNGs were rechecked on the actual .14 client; no redundant paid run.
- Requested 1024×1024, upstream returned 1254×1254. Exact wallpaper dimensions are not promised.
- Earlier isolated .12 results `IMAGE-1789078094935.json` remain historical evidence, not a substitute for the production run.

### Actual production browser geometry

Both image elements: complete:true, naturalWidth/naturalHeight:1254. Download cards retained actual filenames and authenticated same-origin URLs.

| Viewport | Document width | Image width | Card width | Arrow right edge |
| ---: | ---: | ---: | ---: | --- |
| 320 | 320 | 162.4 | 162.4 | 275.2, inside card edge 288.0 |
| 390 | 390 | 232.8 | 232.8 | 345.6, inside card edge 358.4 |
| 926, sidebar expanded | 926 | 420 | 360 | inside card |

Final screenshots showed no empty trailing caption area or clipped download arrow. Viewport override reset. These are browser viewport checks, not physical-phone keyboard/hinge or all-network-condition acceptance. The two-skin browser fixture covers 180px, 232.8px and 420px message columns.

## Native deployment and rollback

Persistent overlay: `C:/Users/datoo/.dsh/chatroom-server/profiles/web/cordis.patch.yml`.

Original chatroom entry stays disabled. Stable replacement id `chatroom-image-release-rc113` points to the .14 file URL with webRuntime injection, preserved existing authorization/configuration and explicit loopback image endpoint/model. The legacy rc113 id does not indicate the active package version.

Pinned DSH 0.1.2-rc.1 handles live plugin loading and replacement client-module resolution natively. No core patch or browser-injected script. Disposal/initialization briefly makes the plugin unavailable: this is not zero-downtime deployment.

Failures caught in the isolated instance:

- Direct rollback to an empty overlay can enable the base before replacement disposal, producing `service "connection" has been registered`.
- Directly changing only the replacement path reloaded the host but left the served .13 client snapshot unchanged. Source inspection found client reconciliation tracks names on internal/plugin, while entry options can change before disposal, leaving an old source registered. Health alone misses this.

**Verified forward procedure:** disable the current replacement without changing its path; wait for disposal, then change its path and re-enable. Base stays disabled throughout.

**Verified rollback to base:** remove replacement while retaining base disabled; wait for disposal, then restore the original overlay. Never mount two transports.

Original overlay backup: `C:/Users/datoo/.dsh/service/backups/image-live-rc113-20260911/cordis.patch.before.yml`; SHA-256 `ef189a8c27db6d63930aa3046a3040482e952eafcb7487c644d508e8d461f027`.

An isolated **cold startup** from the persistent .14 overlay passed health and actual native-client checks, then was stopped. Production was not restarted; its service recovery across a future restart remains untested.

## Implementation, tests and hashes

- image-generation.ts: configured loopback-only endpoint; typed input; no automatic retry; bounded timeout/response; cancellation; strict base64 and decoded PNG; no arbitrary URL download.
- room.ts: existing actor/room authority; account/profile/cancellation rechecks; one generation/session, two/host; durable archive metadata. Config is explicit opt-in.
- Client projection and styles: local image preview, authenticated download and bounded caption/card corrections.
- `npm run check:ci` on .14: exit 0, typecheck, **340 tests / 32 files**, host/types/client builds, **53 browser tests / 13 files**.
- `git diff --check`: passed, existing CRLF normalization warnings only.
- `check-test-client-asset.mjs`: native authenticated page and actual composed asset HTTP 200, both image and corrected-width markers asserted. Asset bytes: 4637004. Native revision identifiers change combined asset hashes across runs.
- `check-image-live-deployment.mjs`: exit 0; production overlay, immutable package and build hashes, identical .13/.14 host bytes, unchanged original startup, matching pinned profile-boot file, public/local health and both anonymous file denials.
- `check-image-cold-start.ps1`: exit 0; isolated cold startup, corrected native client served, instance stopped.
- Staging initially hit PowerShell Utility module autoload failure. Explicit native module import completed bundle verification without overwriting releases; no incomplete release was activated in production.

Package: `C:/Users/datoo/.dsh/chatroom-next-test/packs/deepseek-harness-chatroom-1.5.0-codex.rc1.14.tgz`.

| Artifact | SHA-256 |
| --- | --- |
| .14 package | 1c400fbece4d290bad33260c6baaf6da24755939c1ed64eba9ca094a97e80497 |
| Host, identical to .13 | b55ba3caf1be161d942b430956a24a375bc63ef234c8c54211b8b6c0ded041d1 |
| Client | b4d52400f6597af8c85ee2fccd13132d01d0a8db29f0200ed41ff1ba652d50e0 |
| Active production overlay | c3fed77d6e6845242eb624ea73f3e43a4851299ba5667e5e9cf6dc08081334e7 |
| Original production startup | 4dbe5244a55eaf875c80d7069ee8de13232bad24a6ef7b54fda520bcb5cbba3e |
| Pinned profile-boot file | 20daa1648fda862247d78840e52472e84f4c6846394cb69b79db213d8ed79b6a |

## Inactive service change and remaining work

Prepared native Servy export/startup backup, unchanged scoped DSH runtime copy and machine-encrypted existing MiniMax credential remain inactive. No credentials are in this report.

Prepared startup: `C:/Users/datoo/.dsh/service/run-dsh-chatroom.virtual.ps1`.
Inactive cutover: `C:/Users/datoo/.dsh/service/sandbox-identity-probe-20260911/cutover-production.ps1`.

The cutover script retains its earlier .13 installation preflight. **Do not execute blindly after this .14 rollout:** first reconcile that preflight and preserve the live overlay. Servy's documented non-System vault setup uses a shared administrative trust tier and requires native executable ACL hardening; it is not cross-service isolation. Production grants have not been applied.

未继续原因：原生 Shell 沙箱的服务身份切换、探针注册及专用 ACL 清理需要 Windows 管理员确认；本次原生确认返回操作被取消，不能代点或绕过。下一步：可完成系统管理员确认后，核对当前 .14 配置并执行受控切换；验证真实工具输出、沙箱内写入／外部拒绝、Servy 注册和恢复设置，失败则恢复原服务配置。出图主线已独立完成。

Remaining cleanup: **stopped**, manual dsh-sandbox-probe SCM registration and only its dedicated ACL entries. Probe traversal/read-attribute entries may remain on .dsh, .dsh/service and AppData directory itself. No broad ACL reset or recursive personal-data permission change. Evidence and inactive preparation retained for controlled completion.

Both hot-reload and one-time cold-start test instances stopped; port 3186 checked vacant. Production remains PID76140/3181. No new persistent test service.
