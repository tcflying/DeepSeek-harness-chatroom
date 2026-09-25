# Chatroom 独立优化分支交接

日期：2026-09-09。状态：本地开发候选版；未安装到现用实例，未提交、推送或发布 PR。

2026-09-10 补充独立基础设施待办：Cloudflare CDN 尚未全部验收。主站 JS/CSS 已 HIT，但插件合并包仍 DYNAMIC；后台控制面读取超时，未应用新缓存规则。详见 `cloudflare-cdn-check-20260910.md`。此项不在前述五条代码工作线的完成声明内。

## 目录与隔离边界

- 开发目录：`G:\codex-project\dsh-chatroom-next`
- 开发分支：`codex/chatroom-next-20260909`
- 原源码：`C:\Users\datoo\.dsh\plugins-src\DeepSeek-harness-chatroom`
- 现用安装目录：`C:\Users\datoo\.dsh\chatroom-server\profiles\web\node_modules\deepseek-harness-chatroom`
- Git 基点：`c6401c991a4e39136034758b70d1a5ea160f0ae0`。
- 新 worktree 从原目录当前工作内容创建，包含其未提交改动，不是退回旧提交后重做。`baseline-snapshot.json` 保存了 163 个起始文件 SHA256；判断本轮差异应对照该快照，不能把相对旧 HEAD 的全部 diff 都算成本轮新增。
- 不改 DSH 核心源码、不编辑原 DSH 数据库、不切换线上配置、不重启或替换现用服务。新目录使用独立 node_modules，锁文件未新增依赖。

## 五条并行线与实际修改

| 工作线 | 触发/失效机制 | 本轮处理及证据 |
| --- | --- | --- |
| 自建机器人 @ / 回复延迟 | 指定机器人的投递仍排在主房间 admission/activation 后；再次 @ 同一机器人又可能使前一投递 generation 失效 | 先写各 profile 自身 Session 的持久 inputs 回执，再独立投递；保持原生 inbox 队列，同 profile 不因普通新消息被取消。回归控制主房间激活未完成，仍观察到指定机器人收到消息；16 次并发 @ 得到 16 条不同投递、一次共享激活、零取消 |
| 浏览器响应式 | 长名称、附件、URL、密集房间操作占据小屏宽度 | 复用原 CSS/native 布局；小屏工具栏可横滑、触控按钮增大、长内容折行/截断；320/360/390/768/1280 宽度布局断言，含深色变量、输入框、群管理、附件 |
| 设置页 | 长提示词挤占主要配置；异步保存可能误报成功；真人成员与 AI 成员入口不清楚 | 用原生 details 折叠高级指令，保留服务端模型/推理档位；保存中禁重复提交，只有 API 成功才显示已保存，失败保留草稿；明确真人从群管理加入 |
| 客户端并发 | 全局 busy 把房间 A 的请求当成 B 已在加载；切账号/房间后的旧回包污染当前状态 | 按身份 generation、房间目标合并请求；busy 有操作归属，旧操作不会释放新操作；设置中管理非当前聊天房间后可继续操作；延迟 Promise 回归覆盖切账号、切房间、旧请求晚到 |
| 隐藏缺陷独立审查 | SSE 慢消费者缓冲无界；原生事件授权记录跨逻辑流残留；取消后晚到结果继续上屏 | SSE 有限增量缓冲及 15 秒 drain 截止；原生逻辑流 finally 清理授权，结果复验后只消费一次；普通回复及失败提示都在 await 后复核归属。原生事件 16 个并发相同结果仅一个 200/dispatch，其余 403；同 socket 取消/重开拒绝旧流结果 |

### 故障归因与未自愈原因

- 指定机器人本来依赖共享 admission，主房间排队不会自动绕开这个 await；普通新投递又曾使 generation 递增，导致旧投递被当作过期。新增 tests/room.test.ts 控制这些等待点，不把模型本身的耗时误归因于插件。
- 客户端 busy/回包缺少目标归属，原操作结束无法正确恢复另一房间的控件，刷新同一个错误目标也不会自愈。tests/client-store.test.ts 与 tests/agent-mention-source.test.ts 覆盖可复现流程。
- 原生 `$events` 仅在物理 socket close 清理，不覆盖同 socket 的逻辑流 cancel；授权 Map 的 get→await→dispatch 也不是一次性消费。pinned 原生 Gateway 本身忽略重复结果，因此修复的是重复转发和授权/内存残留，不能夸大为重复执行了模型工具。
- SSE write(false) 是背压，不是异常，不触发 close，所以旧实现会持续积压。直接遇到 false 就关闭也不对：普通大快照会超过 high-water mark。现在为首次快照保留其字节 allowance，附加实时流量受 1 MiB 阈值限制，drain 后清零，15 秒不 drain 则断开慢连接。
- 最后补测发现的边界：2 MiB 快照刚写入，紧接着 presence 广播曾因固定 1 MiB 阈值被关闭。扩大测试到真实序列化的 2 MiB 快照后先失败，补 allowance 后通过；仍使用 response double，不代表真实 TCP 吞吐已测。

## 验收记录

- 22:38（北京时间）`pnpm run check:ci` 完整成功退出：typecheck、29 文件 / 306 单测、host/types/client 构建、7 文件 / 25 Chromium 浏览器测试。
- 22:43 初始 2 MiB SSE 快照回归先 RED：`response.end` 意外被调用一次；22:44 补修后定向 GREEN。
- 22:46 补修后的最终 `pnpm run check:ci` 再次完整成功退出（exit 0）：typecheck、29 文件 / 306 单测、host/types/client 构建、7 文件 / 25 Chromium 浏览器测试全部通过。`sse-final-review.md` 独立只读复审 PASS，限定范围未发现 P1/P2。
- 浏览器测试包含 5 个 viewport，但都是 Chromium，不等于手机 Safari/Firefox 或真实手机软键盘实测。
- Neo 已可建立自有布局测试页；`Page.captureScreenshot` 超时。按浏览器顺序转 Codex 内置浏览器，实际看到当前 CSS 测试夹具中长 URL 折行、附件截断、底部输入区正常。该页明确标记“非生产”，没有登录/发消息；不是完整 DSH 宿主或真实 LLM 验收。
- 前期 Vitest 曾返回 `Failed to connect to the browser session ... within the timeout`，也出现浏览器退出等待。当前串行、显式 127.0.0.1 测试成功退出。原先间歇握手失败的底层环境原因未知；没有为此关闭安全保护或改生产服务。
- 22:40 原目录 163 个文件 SHA256 全部仍匹配基线；现用安装的 host/client 摘要未变化，3181 `/plugins/deepseek-harness-chatroom/api/health` 返回 200 / `{"ready":true}`。这仅证明未替换及健康，不证明旧服务的所有业务功能。
- 22:47 最终摘要复核仍为原目录 163/163 匹配、现用 host/client 未变，`git diff --check` exit 0；构建摘要见 `final-validation.json`。临时布局测试服务已自行退出，未新增长期服务。

## 还不能宣称的效果

- 未测真实多账号同时聊天、多模型长时间吞吐、移动端 Safari/Firefox、软键盘与真实弱网；没有承诺具体吞吐上限或模型响应秒数。
- 本轮没有抬高 DSH 核心调度并发参数；消除的是插件内不必要的串行与状态竞态，实际并发仍受宿主与供应商限制。
- SSE 的 1 MiB 是写入前增量缓冲阈值，不是进程内存绝对上限；单帧可越过阈值，初始快照另有 allowance。真实网络容量和大房间恢复还需隔离实例验证。
- 独立复审报告是有界静态审查，不等于不存在任何隐藏 bug。各 lane 报告保留了中途失败/修复历史；以本交接的最终门禁记录为最新集成结论。

未继续原因：用户要求保持当前可用实例独立，本轮只交付新分支源码；没有把新构建安装到原服务，也没有用生产账号制造压测流量。最低源码及浏览器布局验收已执行。下一步：在另一个 DSH_HOME、数据库、端口启动该候选版，用独立测试账号和真实模型执行多人/多机器人端到端与持续负载验收；通过前不替换现用实例。

## 后续接手顺序

1. 在开发目录确认当前分支与 `baseline-snapshot.json`，保留所有工作区改动；不要 reset/clean 原目录。
2. 阅读各 lane 报告、`sse-final-review.md` 与本文最终门禁记录，先处理已有实证问题，不重复全量泛审计。
3. 若进入试运行阶段，使用独立 DSH_HOME 和安装位置，不共享现用数据库单写入口；如交付长期服务则登记 Servy。
4. 真实验收应至少覆盖两个真人浏览器身份、多个不同模型机器人、快速连续 @、换房间/换账号、取消/改模型后旧回复不再出现、连接中断恢复。
5. 获得明确切换/发布要求前，不覆盖线上、不提交 PR、不推送。
