# 连接恢复与故障监控验收 · 2026-09-11

## 交付结论

生产插件已加载 `1.5.0-codex.rc1.16`。服务器状态灯移至原生侧栏左下角，新增手动重连；QQ2007 仍为默认，新版同时保留原生风格。修改仅限本插件、插件发布目录、当前部署 overlay，以及本任务的原生定时监控。未改 DSH 源码、启动脚本、OpenCodex 路由或账号；没有关闭沙箱/认证，没有提交或推送。

最终机器核对：`dsh-chatroom` 在 Servy 为 Running，唯一聊天监听 `127.0.0.1:3181` / PID 76140；OpenCodex `127.0.0.1:10100` / PID 5780。隔离测试 3186 已停止，临时浏览器标签已关闭，原公网标签保留。

## 已测与证据

| 验收对象 | 结果 | 证据 |
| --- | --- | --- |
| 最终源码检查 | TypeScript、349 项单元测试、54 项 Chromium 测试通过 | `npm run check:ci`，15:41；没有用测试数量代替公网验收 |
| 原生侧栏接口 | 使用 `sidebar.footer.action`，消费 `ConnectionHandle.state/reconnect`；不另起传输栈 | `src/client/ServerConnectionStatus.tsx`、`src/client/index.tsx` |
| 严格状态 | 原生连接、群聊流、通知流按需均恢复才转绿；15 秒后明确超时；后台暂停/离线/登录状态不冒充在线 | 组件与 store 测试；隔离真实断线截图 |
| 隔离真实断线 | 停止**仅 3186 测试进程**，红灯及“连接超时 · 重试中”；恢复进程后自动转绿 | `connection-rc115-isolated-timeout.png`、`connection-rc115-isolated-recovered.png` |
| 原公网手动重连 | 桌面及 390×844 手机原生风格实点重连，最终 connected；原会话/登录保留，草稿“重连验收草稿，不发送”保留；未发送 | 本轮 IAB tab 1 的 AX/DOM 实测；`connection-rc115-live-desktop.png` |
| 手机布局 | 展开侧栏 footer x=12、宽256、高52；折叠按钮 x=6、y=736、44×44，未压住聊天输入；QQ2007/原生均可用 | `connection-rc115-live-mobile-expanded.png`、`connection-rc115-live-mobile-native.png`；自动几何矩阵 320–1440px |
| 原有头部灯 | 头部 `.dsh-chatroom-presence-dot` 数量为 0；身份/在线人数仍显示 | 原公网 DOM |
| 预览失败恢复 | rc1.15 验收中观察到一张预览 `complete=true,naturalWidth=0`；同一文件带登录下载 200、PNG 校验通过、匿名401。旧预览没有失败重试。rc1.16 增加失败提示/显式重试，以及服务器重连后只重试失败文件 GET | `RecoverableImage` 单测；原公网 rc1.16 最终5张历史图片全部 `complete=true,naturalWidth>0` |
| 最终运行包 | Host/client 摘要与工作树构建一致；原启动脚本摘要未变；DSH 核心模块与先前只读基线副本一致；公网/本机健康200、证据写入正常、匿名图片401 | `CONNECTION-RELEASE-20260911.json`、`verify-connection-release.mjs` |
| 最终界面 | QQ2007、原验收会话、图片加载正常、状态绿、输入框为空；原视窗尺寸已恢复 | `connection-rc116-live-final.png` |

预览错误的**文件完好及无重试入口已确认**；单次失败请求的原始网络响应未捕获，不能断言由某个代理/服务器状态导致。最终通过页面重载重新读取了图片；自动重试处理本身通过错误事件单测验证，未为复现故意破坏公网图片。

## 后续监控已配置

1. 插件实际调用留证：图片开始/成功/失败带操作编号、会话编号、耗时、文件字节数；失败保留脱敏错误类别、嵌套网络错误码和 HTTP 状态。模型流异常及失败 turn/end 同样记录。不会保存提示词、错误正文、Cookie、密钥或上游响应体。
2. 插件运行时每15秒探测本机 OpenCodex `/healthz`，4秒超时；变化即时记，健康每分钟记，包含 OpenCodex PID。是免费健康请求，不会生成图片、改变渠道或重试付费任务。
3. 原生 heartbeat `automation-4` / “聊天服务与生图故障监控”，每5分钟；配置已读取核对 `ACTIVE` 和当前任务绑定。检查本机聊天、公网聊天、OpenCodex、日志可写性、最新 provider 记录的新鲜度和新增真实调用失败。无变化保持安静，新故障/恢复/异常 PID/证据断档才通知。不自动重启生产或放宽安全设置。
4. 独立 observer 已手动执行多次并写入磁盘；15:31:23 采到部署过渡期本机非 JSON 响应，15:31:41 记录恢复，后续三项均健康，证据正常。**这些是即时执行证据，不冒称定时调度已经完成首轮自动触发。**

记录目录：`C:/Users/datoo/.dsh/chatroom-server/chatroom/diagnostics`。

- `events.jsonl`：实际调用/进程生命周期/探测记录；当前及3份轮转，每份约2 MiB。
- `observer/latest.json`、`observer/observations.jsonl`：独立巡检摘要与轮转历史，同样约8 MiB上限。
- 写入错误/队列丢弃在健康接口暴露；该状态不伪装成普通聊天服务故障。

取证测试包含嵌套 `ECONNREFUSED`、HTTP 状态脱敏、流失败不重试且原样抛错、轮转、磁盘写入失败、健康→断开→新PID恢复。实际房间生图工具测试证明开始/失败共享操作编号；未授权请求不会发出网络调用。

## 故障归因与剩余边界

已确认的失效机制：旧图请求只报告 `fetch failed`，底层 socket cause 没被保留；旧连接 UI 缺少集中状态与重连，浏览器原有 `<img>` 加载失败也没有自恢复入口。新补丁针对这些机制增加可恢复入口和证据。

历史 13:34 故障：M3 原生工具结果 `Error: fetch failed`，GPT 原生重试 `TRANSPORT` 后 turn/error。旧 OpenCodex 诊断最后记录12:36:34，新进程启动13:43:27；这段记录缺口**不能证明整个时间段服务离线，也不能证明退出触发者**。先前 SCM 有界查询未找到对应事件，本轮 Servy 日志目录中亦未找到可归于 OpenCodex 的额外文件。静态 `quiet-trigger` 脚本只涉及 Codex TRACE 数据清理，不能当作本次进程退出证据。

未继续原因：历史进程退出触发原因缺少当时的退出码、信号或服务控制记录，当前生产没有相同可安全复现的故障；不能通过猜测或主动中断生产补造证据。下一步：若故障再现，关联新的实际调用 operationId、错误码、provider PID 及原生系统事件；需要当时已留存的外部退出记录才能追溯旧故障。

监控不等于“所有未来问题都能抓到”：15秒/5分钟采样之间的瞬时故障可能漏检；进程崩溃可能丢失尚在队列中的日志，轮转会淘汰旧记录；Codex 应用/电脑关闭时原生定时提醒不运行。健康绿不证明上游付费出图成功，也不能监测每台用户设备的渲染或移动网络。没有新增不受管理的常驻服务；插件探针依附既有 Servy 管理的 dsh-chatroom。

原生 Shell 的 LocalSystem/no-logon-SID 身份问题与本次图片工具/连接监控是独立路径，本轮没有切换服务身份或宣称该问题已解决。
