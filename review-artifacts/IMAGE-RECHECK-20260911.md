# Original in-app browser image failure recheck — 2026-09-11

## Current result

**Image availability recovered and verified in the original browser. Historical outage trigger and a permanent prevention of model error-echo are not established.**

Original URL: https://talk.opcvip.net/ . Original room: GPT 与 M3 生图验收 IMAGE-1789082741978. Room id: `29f58452-d88b-4495-9aee-03028b49df15`.

All requests below were submitted through the existing in-app browser composer, with the existing 本机管理员 identity and actual AI-member suggestions. No API-injected success replies, substituted images, deleted history, model-route change or service restart.

| Time (Asia/Shanghai) | Member / request | Actual outcome |
| --- | --- | --- |
| 13:34, user history | M3 / 生成水墨山水图 | Real tool failure: `Error: fetch failed`; native seq 74/75 |
| 13:34, user history | GPT / 生成水墨山水图 | Five `TRANSPORT` / `Connection error.` retries; failed turn end seq 303, no new image tool call |
| 14:29, reproduction | M3 / same short request | Repeated old error text without a new tool call |
| 14:37, instructions-only A/B | M3 / same short request | New profile instructions loaded, but still repeated old error without a new tool call |
| 14:39–14:40 | GPT / 生成水墨山水图 | Fresh image tool call seq 407, result seq 408, completed turn |
| 14:40 | M3 / 请重新画一张水墨山水图：远山、湖面、小舟和薄雾。 | Fresh image tool call seq 136, result seq 137, completed turn |
| 14:42–14:43 | M3 / 生成水墨山水图 | Fresh image tool call seq 190, result seq 191, completed turn |

## Fault attribution and evidence

- **13:34 mechanism confirmed:** GPT transport failed before image-tool execution; M3's actual image-tool fetch failed in about 7 ms. This was not merely a broken browser preview.
- **Correlated runtime gap:** retained OpenCodex `runtime-diagnostics.jsonl.1` ends old PID 40432 samples at `2026-09-11T04:36:34.151Z` (12:36:34 local). Next relevant start is PID 5780 at `2026-09-11T05:43:27.624Z` (13:43:27 local). There are no intervening records in that file. This is evidence of an observability/runtime gap, not proof of the exact exit trigger or that the listener was absent throughout.
- **Initiating trigger unknown:** bounded SCM event lookup for 13:20–13:50 produced no matching OpenCodex/Servy event. Tray actions end on September 10; watchdog history is September 5; crash.log last modified September 4. Untimestamped shutdown lines cannot identify this incident. No speculative restart, manager change or intentional production outage was used to manufacture evidence.
- **M3 stale-error behavior confirmed:** turns 3 and 4 returned the old error with no new tool events. Both the old and revised system profile instructions were inspected in actual native request headers; tools remained present. Revised instructions alone did not recover the short prompt. An explicitly new drawing request recovered tool use; a subsequent identical original short prompt also invoked the tool and succeeded. The old restrictive test wording is a plausible contributor, **not a proven sufficient root cause**. No permanent guarantee against recurrence is claimed.
- **Recovery policy:** uncertain paid image operations are not automatically retried. Fresh user requests remain eligible. A successful process/health check alone was not accepted as image recovery.
- Mention candidate selection plus subsequent Chinese text worked in this browser path. Malformed older mentions were visible, but no physical-phone IME defect was reproduced or claimed fixed.

## Changes

Only the two existing test AI members' `instructions` fields were changed through the authenticated normal owner API. Readback confirmed unchanged ids, names, room, role, provider, model, reasoning effort, enabled state and createdAt. Both were idle; existing native Session ids/history were retained.

- GPT: `oc-gpt6-low / gpt-6-astra / low`.
- M3: `minimax-cn / MiniMax-M3 / high`.
- New wording scopes one actual image-tool invocation to **each new user request**, forbids presenting a historical error/image as a new result, and retains no automatic retry within the same request.
- `image-profile-instructions.mjs` is now shared with the existing live acceptance helper, so future test profiles no longer install the ambiguous old wording.
- Prior-profile rollback artifact: `image-profiles-before-1789108623371.json`. No credentials in that artifact.
- DSH source, production plugin .14, OpenCodex configuration/credentials, sandbox controls, QQ2007 default/logo and original browser login were not changed this turn.

The existing image route remains plugin → local OpenCodex → its configured official OpenAI image forwarding route. M3 orchestrates that tool; it is not itself the pixel-generation model.

## Actual fresh-file acceptance

| Request | File id | Bytes | Actual decoded size | SHA-256 |
| --- | --- | ---: | --- | --- |
| GPT | `8ebaa47b-8dda-400b-9283-22283cb82566` | 3243587 | 1536 × 1024 | `27db2eac94f11bf773d0dd95adef832ccf07b42d18d5a920a17db0b868138841` |
| M3 new request | `200c5997-832d-407f-9ce0-c4356c3b5852` | 2636898 | 1536 × 1024 | `d1b69ef1737ed9ebb76b50f4ba52af38d4c2154eb3fc13c1e1563f392887ff0f` |
| M3 original short request | `94902804-6df9-4c8b-a751-b6a0a3823e7e` | 3045027 | 1536 × 1024 | `5a6c1d04d120d7463ac32cac936fb7d9ac897953aa062c3b6bf1d566fdb06088` |

For all three: authenticated download HTTP 200, PNG pixel decode passed, anonymous access on the public origin HTTP 401. Original browser reports `complete:true`, natural size 1536 × 1024 for each. Requested size was 1024 × 1024; upstream did not honor that exact size. No exact wallpaper dimensions are promised.

Evidence files: `RECHECK-20260911.json`, `RECHECK-20260911-native-events.json`, `RECHECK-20260911-GPT.png`, `RECHECK-20260911-M3.png`, `RECHECK-20260911-M3-repeat.png`.

Final actual viewport: 926 × 952, document scrollWidth 926, three new images each 550.25 × 366.84 CSS pixels. Latest picture and its download card are fully visible, QQ/penguin logo and QQ2007 selector retained, composer clear. Initial partial image loading resolved; final screenshot is decoded, not an empty placeholder. No additional physical-phone/IME/all-network or service restart acceptance is claimed.

`verify-image-recheck-20260911.mjs` passed for all three files through delivery-check's deterministic receipt. Profile-update syntax check and `git diff --check` passed. No source/bundle changes; the prior full package suite was not rerun as a substitute for this actual browser test.

## Remaining boundaries

未继续原因：13:34 事件缺少当时的底层 socket cause 和进程退出记录，现有运行记录在 12:36–13:43 有空档；当前同入口已恢复，不能靠无关联旧日志、破坏性断网或猜测断言根因。下一步：取得该时段退出事件或下一次自然故障的同刻请求/进程证据，区分代理停服、进程退出与上游连接问题。M3 的历史错误复述已恢复，但永久防复发尚未证明。

The prior native Windows shell sandbox service-identity problem is separate and remains unresolved. Its prior native elevation attempt was cancelled; this browser recheck did not repeat that prompt or alter protection. Existing controlled-cutover preparation and prerequisites remain documented in `IMAGE-GENERATION-20260911.md`.
