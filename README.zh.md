<div align="center">
  <h1>DeepSeek Harness 多人 AI 聊天室</h1>
  <p><strong>为 DeepSeek Harness 原生 Web 界面补上一套完整的多人协作层。</strong></p>
  <p>简体中文 · <a href="README.md">English</a></p>
  <p>
    <img alt="版本 1.5.0-codex.rc1.53" src="https://img.shields.io/badge/version-1.5.0--codex.rc1.53-4f6bff">
    <img alt="Harness 0.1.2-rc.1" src="https://img.shields.io/badge/DeepSeek_Harness-0.1.2--rc.1-111827">
    <img alt="pnpm 10.33.4" src="https://img.shields.io/badge/pnpm-10.33.4-f69220">
    <img alt="代码 MIT；头像素材单独授权" src="https://img.shields.io/badge/code-MIT-22c55e">
  </p>
</div>

在原生 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 工作区中并列提供群聊、Solo 和私聊，同时保留消息流、Agent 运行时、模型选择、权限模式、轨迹和 Session log，不创建第二套 Agent 对话界面。

<p align="center">
  <img src="docs/assets/group-chat.jpg" alt="包含头像、提及、表情贴附、图片、消息操作和分支预览的 Harness 共享群聊" width="100%">
</p>
<p align="center"><sub>人类优先聊天、原生 Agent 回复、富媒体、表情贴附和分支动态都在同一个 Session 中。</sub></p>

## 为什么是这个插件

rc1.53 在安装聊天室插件期间永久跳过非约束性的启动“内测声明”。通过原生 `settings.onboarding / welcome-notice` 插槽替换并完成这一条引导，外网页刷新不再依赖 DSH 仅存于当前页面内存的已读状态。模型配置、登录、权限审批和设置保持不变，不修改 DSH 源码或设置持久化权限。验证与启用证据单独记录。

rc1.52 已于 9 月 14 日 01:53 CST 发布。它修复其他插件共用原生底部插槽时重连按钮被挤出屏幕的问题：内置浏览器实测左边缘从 -38px 回到 5.6px，44px 按钮能真实命中，点击后连接恢复。两种风格及 320–1440px 已覆盖，当前公网成员/管理员验收和隔离 Host 通过；最新完整 CI 为 504 项单测、108 项浏览器测试。部署侧巡检另修正为仅用最近五分钟判断短连接聚集，保留历史失败，并容忍桥接 PID 不可用；本次巡检调用通过，原定时提醒仍暂停。此前间歇性公网会话链接超时和历史 13:34 进程退出触发原因仍未确认，不能用后来的成功检查抹去。未改 DSH 源码、TUN、凭据或网络配置。

rc1.51 已于 9 月 14 日 01:36 CST 发布。完整 CI 通过 501 项单元测试、107 项浏览器测试，隔离 Host 验收通过，本机/外网下发客户端匹配不可变包，Host 与入口桥 PID 未变化。八次线上目录响应的插件过滤阶段耗时为 1–3 毫秒。公网及内置浏览器综合验收仍未完成：外网传输、普通账号进房及折叠底部问题单独保留，不算通过。以下保留打包时的范围说明。

rc1.51 当前为候选版本，尚未完成生产验收。会话目录过滤复用同一次原生可信响应中的父子关系，避免再次扫描磁盘目录。群成员关系、私聊 Solo 归属及运行中会话的最新父关系仍优先且实时检查；缺失、格式错误或重复的目录关系回退原有请求内惰性读取。不缓存权限，也不接受客户端提供的目录作为依据。回归检查覆盖跨账号拒绝、成员撤销、实时父关系优先、循环关系、回退和取消请求。完整 CI 与线上延迟证据单独记录，不把本项优化当成上游 Host 延迟已解决。

rc1.50 已于 9 月 13 日 02:54 CST 核对上线。它统一手机导航与已安装响应式插件的层级：原生侧栏及其内部的设置窗口高于旧遮罩和 Files，聊天室可点击遮罩仍低于导航。直接浏览器四组检查验证了两种风格、390/768px 下的收起按钮、遮罩、设置命中区域。当前类型检查、497 项单元测试与构建通过；完整 CI 因浏览器测试页启动中断、尚未执行测试而仍是失败，直接浏览器退出也超时，均不算通过。本机与外网健康接口就绪，完整下发客户端匹配不可变 RC150 包，DSH 与入口桥未重启。实际线上界面验收另行记录，不改原生 DSH 源码或账号权限。以下 RC149 为历史记录，包内 README 保留打包时快照。

rc1.49 已于 9 月 13 日 02:29 CST 核对上线。它增加对已安装 `dsh-web-all` 移动侧栏规则的局部兼容：该插件“只留顶部按钮”的选择器隐藏了整个原生底部区域，连聊天室连接状态和已打开的设置窗口也一起隐藏。修复只恢复包含聊天室界面的底部区域，其他原生区域仍隐藏，设置是否挂载仍由管理员权限决定。使用原始冲突选择器在 390/768px 复现两项失败，修后相关浏览器检查通过 43/43，完整 CI 通过 497 项单元测试和 103 项浏览器测试（自然退出 0，源码未变）。本机和外网健康接口就绪，实际下发客户端均与不可变 RC149 包完整匹配，DSH 和入口桥没有重启。隔离 Host 与公网候选 CSS 界面检查已完成，但测试浏览器退出超时仍保留为综合验收失败；实际线上页面验收单独记录。包内 README 保留打包时快照，以下 RC148 为历史记录。

rc1.48 已于 9 月 13 日 01:37 CST 经现有两阶段插件 overlay 上线，DSH 与入口桥没有重启。QQ2007 在实际会话宽度不超过 24rem 时把头像、姓名排在正文上方，使 320px 视口、56px 原生侧栏下的正文仍可使用完整 208px。连续消息保持紧凑，默认风格保留左右布局，各设置卡片的可编辑标签至少 14px。公网实测已确认正文 208px 且不横向溢出、可编辑标签 14px。完整 CI 通过 497 项单元测试、101 项浏览器测试并自然退出 0；不可变包、源码映射、实际下发客户端及隔离 Host r3 已通过。公网综合及 IAB 验收仍未完成，保留的失败和测试浏览器退出超时不能算作全通过。本次不改 DSH 源码或权限逻辑；包内 README 保留打包时的阶段快照。

9 月 13 日 rc1.47 公网检查已通过普通成员权限、图库缩略图/原图切换/关闭清理、Files 侧栏打开时的管理弹窗和一次点击重连。综合回执仍因上面两项排版问题判为失败。本机、入口桥及公网的鉴权会话目录分别用时 4.2/3.7/2.9 秒，均返回相同 56 行；这只能证明当前读取恢复，不能证明历史超时已归因。恢复范围不包含 TUN、全局网络变更或内置浏览器底层修复。下文保留的是**发布前历史证据状态**，不代表当前生产版本。

rc1.47 是当前候选。它为同步 `activateSession` 重入增加同一会话 activation latch：正在发布的当前会话重复 activation 会被有界处理，真实同步选择另一个会话仍会获胜，不会被压制。它覆盖三个后续状态发布窗口，另加要求身份的 prompt 同步选择 B；定向重入证据通过 60/60 加 typecheck。AutomationPanel 使用两个等宽 `minmax()` 列，并在窄屏退回单列；修前两个几何检查为红，修后 settings-readability 通过 14/14 加 typecheck。完整 CI r2 已通过 typecheck/build、56 个 unit 文件 / 497 个测试及 16 个 browser 文件 / 93 个测试；子进程于 `2026-09-12T08:56:52.672Z` 自然退出，`exitCode: 0` 且源码未漂移。包、不可变 stage、部署、health、隔离、公网、原始 IAB 和 reconnect 证据仍未声明；生产仍为 rc1.42。

rc1.46 增大了 AI可管理群聊目录状态卡的 reload 点击区域。完整 CI 通过 typecheck/build、56 个 unit 文件 / 490 个测试及 16 个 browser 文件 / 89 个测试，package stage 也通过并有不可变 bundle 证据。其隔离 r1 在 768px 定位原生折叠侧栏 Settings 文字失败，Settings 尚未执行；原 IAB tab 1 的 AX 超时/open-panel 排队仍保留。这些失败仍阻塞，不能作为验收结论。

rc1.45 修正了真实 legacy-auth Settings contract：`enabled=false`、`authenticated=true` 时账户卡不得渲染（`enabled && authenticated`），并配套真实 fixture。其目录 store 增加身份/disposal 隔离、明确 loading/error/empty/手动 retry 状态、15 秒读取边界，以及生命周期和手动刷新路径的取消 signal。完整 CI 已通过 typecheck/build、56 个 unit 文件 / 490 个测试及 16 个 browser 文件 / 85 个测试；包/不可变 bundle parity 已通过。这些层不能替代保留的隔离 r1/r2 失败或 r3 的状态卡 reload 命中区过小；生产仍为 rc1.42。

rc1.44 r2 完整 CI 已通过 typecheck/build、55 个 unit 文件 / 477 个测试及 16 个 browser 文件 / 85 个测试（`RC144-check-ci-r2.log`）；其子进程于 `2026-09-12T06:36:24.651Z` 自然退出，`exitCode: 0`，候选源/package 哈希未漂移。首轮收据仍保留为失败：unit/typecheck/build 通过，但 Chromium 60 秒内未连上，16 个 browser 文件没有运行测试（`RC144-check-ci.log`，`2026-09-12T06:22:30.501Z` 的 `exitCode: 1`）。上述后续隔离发现阻止其提升；不声明不可变 stage、部署、health、公网、原始 IAB 或 reconnect 证据。

rc1.43 源码已冻结，其 r3 完整 CI 通过 typecheck/build、54 个 unit 文件 / 470 个测试及 15 个 browser 文件 / 79 个测试（`RC143-check-ci-r3.log`）。它避免长真人消息气泡重复扣减头像布局空间：消息列使用已预留的可用宽度，使 QQ 320px 不再因重复扣减而变窄。sidebar dispose 现先设定 disposed guard，之后排队 reconcile、schedule 与迟到的私聊目录 continuation 都会短路；定向 sidebar 证据为 33 个测试通过加 typecheck。首轮 CI 保留失败（53/54、469/470）；r2 在 browser 输出后被硬编码 120 秒执行器 guard 截止，r3 在汇总后的 teardown 约十分钟后自然退出。它不归因 IAB 根因。不可变 stage 两目录哈希一致，其包内 README 是 stage 时快照。生产仍为 rc1.42，隔离/公网/IAB/reconnect 证据待完成。

rc1.42 已通过完整 CI（54 个 unit 文件 / 468 个测试；15 个 browser 文件 / 78 个测试），并在 04:40:47 stop / 04:41:07 start overlay 后以同一 PID 进入生产，health ready。其 partial 公网收据通过 member `403` 边界、3 个图库项、reconnect 与两次目录读取。仍保留失败：QQ 320px 实测宽度 162px、Files locator 已在 harness 修正、定向 deep link 30 秒超时，原 IAB 读取/截图焦点超时（`RC142-IAB-live`）。手动恢复不升级为根因或完整验收。

<details>
<summary>历史版本边界；下方近期版本是权威的简明索引</summary>

rc1.36 候选只收紧手动重连恢复：原生目录读取未结束时出现的显式重试会合并为读取结算后的唯一一次尾随读取，并重新核验当前身份和连接代次；登出、dispose 或身份/代次改变即丢弃。它不新增轮询、权限扩大、写操作或付费请求重放，也不解释慢读/超时的根因。首轮完整 CI 原文保留为 2 个企业微信测试超时、438 个通过；仅测试清理/await 修正后，`RC136-check-ci-r2.log` 已通过 typecheck/build、52 个 unit 文件 / 440 个测试及 15 个 browser 文件 / 72 个测试。其包 stage/哈希检查通过，但隔离 320px 收据因 Harness 未展开左栏失败；该 Harness 修正后尚未重跑。在该 rc1.36 证据时点生产为 rc1.35；rc1.36 未部署。

rc1.35 让 320px 中央会话栏内主 AI 操作栏按实际容器宽度排布，图标控件不再把标签逐字换行；群聊“自动回复”说明会按认证状态区分：登录部署仅启用中的平台超级管理员，无认证旧模式才是群主/群管理员。URL 选房会先等待原生目录首次 pending→ready 复原旧 current 的基线；pending 期间新建会话或 current 改变会取消 URL 意图，ready 后真实原生选择仍由 revision guard 优先。未登录的 URL 意图留到登录后才按每个身份 epoch 消费一次，并隔离登出、跨身份和 dispose 后的迟到回调。QQ Style 在 541–900px 为原生底部面板 toggle 预留 64px，在 <=540px 为手机右侧栏 toggle 预留 40px，不隐藏控件也不抬高 z-index。

rc1.34 保证原生目录事件重复发出未变化的当前原生会话时，正在进行的显式 `selectRoom` 不会被误作过期：只有原生选择确实变化才递增 `roomNavigationRevision`，因此可接纳该选房回包；真正的原生导航仍会使旧回包失效。rc1.33 防止其他切房、关闭私聊/线程与换账号后的迟到回包覆盖当前页面；统一旧身份头和 AI 取消操作的平台权限，长连接持续复核访问资格。媒体弹窗区分遮罩关闭、读取失败与付费提交状态未知，隐藏进展停止计时；双皮肤补齐窄区域排版、可读控件与键盘焦点。认证后的 `session/list` 会话目录读取限制为 30 秒，并把取消信号传给固定版本的原生 carrier；到期返回 HTTP `504` 并释放浏览器 single-flight，因此手动重连或刷新可以重新读取。这只限制卡住的读取，不说明根因，也不保证网络或目录稳定；不会自动重放写操作或付费请求。

rc1.31 补充隐藏非管理员的原生访问模式控件（匹配已核验的中英文无障碍标签，服务端独立校验权限）。保留 rc1.30 身份确认后立即读取已授权会话列表、连接代次改变后同步一次的修复，不新增轮询或放宽权限。“我的账号”使用紧凑间距和 44px 退出按钮；服务端 bundle 与下述 rc1.27 相同。

rc1.27 将登录部署的管理权限统一收紧到平台超级管理员：原生设置/模型控件、群与 AI 配置、管理斜杠命令和提权审批同时受界面与服务器检查，保留普通聊天和“我的账号”。群聊进展行跟随真实思考、回复和工具事件更新最后一行，显示多久未更新，30 秒无新进展时明确提示等待；失败、取消、断线分别显示，隐藏页面后停掉显示计时器，不传播工具参数与结果。

rc1.26 去掉“每次群聊恢复就绪就强制重连原生会话”的逻辑；已有登录的首次加载、同账号读取恢复不再主动断开原生连接，真正登录或身份改变仍会更新连接。

rc1.25 修正 AI 管理表单的标签、控件间距；将“启用成员”文字与 38px 开关外观分开，避免文字挤到添加按钮。异步加载时不再误报空列表或没有管理权限。

rc1.24 将 **AI 成员 / 群管理** 改为浏览器顶层弹窗，不受 Files 等插件侧栏的层叠与裁剪影响；支持 Esc、遮罩关闭并归还焦点。通知流立即发送命名心跳，不再等待首个 15 秒心跳才确认连接；按响应生命周期清理，客户端检测连接建立超时和心跳中断后有界重连。状态灯详情与限流脱敏日志分别记录原生会话、群消息和通知状态；后台暂停、恢复只处理读取，不重发消息或付费操作。

以下 rc1.38 部署段落是保留的部署前快照，已由上方当前 rc1.38 状态及近期版本条目取代；不得把它读作当前包、stage、部署、health 或线上验收状态。

适配包 `1.5.0-codex.rc1.38` 基于上游 1.4.4；开发依赖基线为 Harness `0.1.2-rc.1`，此前已核验 CLI `0.1.5-rc.1` / transport `0.1.5-rc.2` 的依赖批次兼容性。rc1.38 源码已冻结，完整 CI 已通过 typecheck/build、52 个 unit 文件 / 447 个测试及 15 个 browser 文件 / 75 个测试；包、stage、部署、health 和线上验收仍待证。它用稳定的 `[data-turn-tail]` slot 覆盖 rc1.37 的实际 Host cohort，而非写入 `data-time-hover-root`；旧 marker 选择器仍为 fallback。其 `session/list` 请求处理不据此声称已找到此前公网超级管理员超时根因。rc1.37 的不可变包 Host/client bundle SHA-256 一致，已在生产双阶段 overlay 生效；health 为 `200`，diagnostics enabled/healthy/no-drop，托管服务为 Running。隔离收据与完整公网 member 探测通过。这并不升级为完整验收：公网超级管理员 `session/list` 在选房前超时，aggregate/reconnect 仍失败；原 IAB 页首次 welcome，关闭/展开导航并手选原房后恢复且保留草稿，但真实 Files 窄中心 320px 仍有 tools 24.49px（`RC137-IAB-files.png`）。实际 Host 未暴露旧 `data-time-hover-root`，使 rc1.37 依赖该旧 marker 的选择器未覆盖 `[data-turn-tail]` cohort；旧 fixture 也未建模该 cohort，这不表示 rc1.38 会写入 marker。rc1.36 已有通过的 r2 CI 与 stage/哈希证据，但失败的隔离 320px 收据仍保留并阻止提升；它未部署。rc1.35 已读回完整 CI：52 个文件 / 437 个测试、build exit 0，随后 15 个 Chromium 文件 / 72 个测试；清理阶段约四分钟。其 dry-pack/pack 不可变包、stage/生产双阶段 overlay、Host/client 哈希、served marker 和 ready/healthy 诊断均已读回一致，隔离 guest 收据通过。公网 member 覆盖通过了选房、预期的管理 `403` 拒绝、账号弹窗及 320/390/768 命中目标；首次超级管理员深链等待超时，独立重试成功选中原生房间。后续超级管理员连续检查确认图库 3 张缩略图、原图左右切换、关闭后无 in-flight 请求，以及 1440/768/390/320 的 Style 可点击。这仍只是部分线上验收：Files 槽和手动重连收据未完成；原 IAB 页首次停在 welcome，重连并手选房间后恢复且保留草稿，但 CDP/kernel 超时阻断了 IAB 320px Files 与 768/390 两种 toggle 状态检查。rc1.34 仍按版本留存：IAB 收据为 `passed: false`，先前 member 最小探测不能把它提升为完整公网/IAB/重连验收。不可变 rc1.35 包内 README 是 stage 时快照，本次工作区文档更新不在该包内。历史 13:34 触发原因仍缺因果证据，既有监控自动化仍是 PAUSED；诊断 journal 在后台独立工作，不据此声称自动覆盖。它不是上游发布版，安装此适配包不会修改 DSH 源码。共享部署使用独立 `DSH_HOME` 与工作区，避免把原有私人会话和无关插件接口一起开放。

</details>

| 原生 Harness 完整保留 | 多人协作能力补齐 | 身份体系可用于线上部署 |
| --- | --- | --- |
| Session、Agent 预设、模型、权限、Think/工具轨迹、审批、问答、斜杠命令、停止/排队/转向和失败重试全部沿用原生实现。 | 共享群聊、在线状态、提及、回复、表情贴附、图片文件、转发、多选、分支、消息提醒、群管理和私聊。 | 本地账号、管理员统一建号、角色与停用、`dsh-auth`、企业 OIDC/SSO、认证自动跳转和网关 `forward_auth`。 |

插件完全独立于 Harness 主仓库，**不修改 DeepSeek Harness**。初始化是异步的；聊天室尚未就绪或启动失败时，聊天室和原生会话接口均返回 `503`，防止绕过账号权限。

## 界面预览

<table>
  <tr>
    <td width="50%">
      <img src="docs/assets/new-group-setup.jpg" alt="在原生空白 Session 首屏直接创建群聊"><br>
      <strong>在原生欢迎页选择群聊或 Solo</strong><br>
      默认选中群聊，第一条普通消息发送时再建立 Room；随后从群管理邀请系统账号。
    </td>
    <td width="50%">
      <img src="docs/assets/group-management.jpg" alt="包含系统账号目录和群成员的顶层群管理对话框"><br>
      <strong>在当前会话中管理成员</strong><br>
      登录部署中仅启用的平台超级管理员直接添加系统已有账号；普通成员只查看角色和在线状态。
    </td>
  </tr>
  <tr>
    <td colspan="2">
      <img src="docs/assets/account-settings.jpg" alt="Harness 原生群聊与账号设置页"><br>
      <strong>所有管理能力收敛到 Harness 设置</strong><br>
      注册策略、统一建号、角色、密码、私聊、`dsh-auth` 和 OIDC 提供方都沿用原生设置页设计语言。
    </td>
  </tr>
</table>

> 截图是线上 v1.1.5 产品界面的历史快照，不代表当前版本的全部界面；它们不是设计稿或 Mockup。

## 核心能力

### QQ2007 / 原生风格

右上角切换 QQ2007 / 原生风格；QQ2007 为新用户默认，保留用户已保存的原生选择。

### 会话图库、框选改图与 MiniMax 视频

群聊标题栏“会话图库”读取当前主会话全部历史图片（分支只读本分支），不是只收集屏幕上已渲染的消息。缩略图独立保存在本机数据目录 `thumbnails/v1`，480×320 WebP 上限，保留原图；点击在本页弹出大图，左右切换、全部缩略图和下载原图。文件名与元数据默认折叠。只下载当前所选原图，关闭、切换或隐藏页面时中止读取、释放对象 URL。撤回与会话权限在服务器检查。

图片预览内“框选改图”支持鼠标与触屏矩形选区，生成与原图同尺寸的透明 PNG 遮罩；上传的原生图片在明确操作时转换为鉴权文件引用。当前主 Agent（GPT/M3）调用 `chatroom_edit_image`，沿既有 OpenCodex 官方图片 `/images/edits` 渠道；失败不自动重复扣费。无需另建 Canvas 应用。遮罩是模型编辑约束，不承诺选区外逐像素不变。

平台管理员可用“视频创作”或图库内“图生视频”。`miniMaxCodePath`（或 `DSH_CHATROOM_MINIMAX_CODE_PATH`）指定已安装的官方 `mcode-tools` 启动器，复用宿主管理的 CN 登录，不复制令牌。Hailuo 2.3 的订阅资格由官方核验；H3/H3 Max 使用积分，先选择模型并勾选额度确认。先持久记录提交，再调用官方连接器；关闭只停止查询/下载，不取消已接纳的生成，不自动重投未知结果。可输入原模型与官方 task_id 读取既有任务，不会生成新视频。结果保存为本地鉴权 MP4，点击才播放，支持字节范围请求。普通成员不能消耗本机 MiniMax 额度。

动态图与查询仅在需要时运行：缩略图接近视口加载，原图/视频窗口关闭卸载，会议状态与扫码查询在隐藏时中止，原生连接沿既有前后台生命周期处理。实际外网、模型与设备验收证据保存在本机，不随公开源码包发布；这些能力不等于 ChatGPT Canvas 全功能复刻，也不改变 Solo/私聊原生会话。

### 风格细节

右上角“风格”提供 QQ2007 和原生两项。QQ2007 作为初始默认风格，左上角显示经典企鹅与 QQ2007 标识；已经明确保存的原生选择不被覆盖，切回原生也恢复原标识。插件换肤覆盖标题栏、侧栏、标签、按钮、消息、菜单、输入框和设置页，不改写宿主深浅色偏好。选择按浏览器站点持久保存并在同源标签间同步；禁止保存时提示“本次有效”。窄屏侧栏使用覆盖式抽屉，顶部紧凑分行，Agent 列表按需展开；QQ 正文和输入至少 16 CSS 像素，保留浏览器缩放与更大的用户字号偏好。这是适配现有功能的经典风格，不是 Windows QQ 客户端的逐像素复刻或官方客户端。

### 插件整合版

`1.5.0-codex.rc1.3` 安装包整合了 `codex/chatroom-next-20260909` 的开发工作。具名 AI 的提及输入先持久接纳，再独立进入各自的原生队列，不等待主房间激活；连续提及不会互相取消。取消或修改 AI 成员后，迟到回复和失败提示均会被拒绝，立即重试会等待旧实例完成启动清理和释放。客户端请求按账号代际和所管理的房间隔离，防止旧回包覆盖新状态或锁死设置按钮。

设置明确区分 AI 成员和真人成员，长指令默认折叠，保存成功后才显示成功反馈。响应式布局回归覆盖 320/360/390/768/1280px。慢 SSE 连接使用原生缓冲、积压上限和排空期限；原生事件答复权限仅消费一次，并随逻辑流关闭清理。这些是本地回归保证，不代表生产吞吐量、真实设备或模型服务已验收。

### 候选版：账号退出与权限边界

“设置 → 群聊与账号”顶部提供当前账号、权限说明与“退出登录”，不需要先进入任何房间。退出只撤销当前浏览器的聊天室登录；失败会保留真实状态并提示重试，不会假装注销。成功退出及登录切换会清理插件缓存的管理数据、全局提示词、企业微信授权视图、搜索及分支/转发内容。企业 SSO 上游会话不由本按钮注销。

| 权限层 | 实际权限 |
| --- | --- |
| 平台超级管理员 | 平台账号、登录方式、全局设置，以及群成员/AI 管理；不自动取得其他人的私有会话 |
| 设置白名单账号 | 登录部署不再获得管理权限；只供无登录旧模式的远程设置路径使用 |
| 历史 `admin` 平台角色 | 不自动增加权限；保留已有账号兼容，界面不再创建这种含义模糊的角色 |
| 群主 / 群管理员 | 登录部署中不获得额外管理权限，群成员、AI 与策略仅由启用的平台超级管理员管理；无登录旧模式仍保留群主/管理员管理路径 |
| 群成员 | 本群聊天、@AI、已授权会话与自己的账号；不能修改本群管理策略 |

非管理员不能挂载原生设置窗口，身份降权也会卸载已打开的窗口；个人资料与退出登录保留在“我的账号”。接口以空字段返回受限配置；AI 名称、短职责、状态仍可见，但详细指令与模型路由不再发送（包括实时事件）。服务器独立拒绝管理 RPC、模型/权限切换、管理斜杠命令与提权审批答复，不依赖隐藏按钮。无登录旧模式不是安全边界；插件不把同主机 Agent 变成不可信用户的安全沙箱，应使用受限 preset 与最小工作目录。

### 共享群聊与人类优先 AI

- 工作区侧栏固定归纳为“群聊 / Solo / 私聊”：共享 Room 进入群聊，原生单人 Agent Session 进入 Solo，私聊目录列出系统全部可用账号。由于一个类别会合并全部工作区，原生按工作区截断的“展开其余会话”按钮会被展开接管，改由每个类别底部的唯一控件承担，其数量与类别计数一致。
- 启用登录后，每个 Solo Session 都归属于创建它的账号。成员只能看到自己已加入的群聊与自己创建的 Solo；未加入的群聊和其他成员的 Solo 不会显示，也不能从聊天室界面打开或发送，未登录或刚切换账号时也不会继承上一个账号选中的消息流。
- 点击“新会话”后继续使用原生欢迎页和输入框，并在群聊/Solo 开关中默认选中群聊；群聊的第一条普通消息才建立共享 Room，Solo 保留完整原生一对一 Agent 会话。
- 普通消息在人类之间实时同步；明确输入 `@AI`，或直接说“DeepSeek 请回答”一类称呼时，会跳过判断模型并直接请求 Agent 回复；其余未提及 AI 的消息可由各群开启的判断模型决定是否回复。
- Agent 仍在回复时，新消息会立刻广播给所有成员，并以普通参与者气泡固定在当前答案之后；AI 是否处理改为独立的异步流程。同一个气泡只向发送者显示“正在判断/正在排队”状态以及“引导 / 编辑 / 撤回”控件：判断器拒绝回复时仅移除 AI 状态，不移动气泡、不干扰当前答案；判断器选择回复或用户明确提及 AI 时，原消息在上一条答案完成后成为下一轮提问。引导会把原消息转入当前回合，编辑会在模型领取前撤回并把原文恢复到输入框，撤回会直接取消尚未进入模型的消息。
- 启用中的平台超级管理员可在“设置 → 群聊与账号”选择全局自动回复判断模型，并分别编辑主群/分支 Agent 与自动回复判断 Agent 的系统提示词；保存后下一轮生效，无需重启 Harness。
- 原生 `@` 菜单同时列出 Agent 和当前群成员。发送者身份在 Host 接纳 Session 消息前写入，浏览器和模型看到相同的发言人。
- 共享会话继续使用原生侧栏，并增加更舒展的行高和成员九宫格群头像；在原生侧栏重命名会同步写入持久群名，切换会话和重启后都不会回滚。
- 群聊、Solo 和私聊统一沿用群聊输入框的布局与交互，消息流和输入框使用整个可用内容列，不再受原生固定宽度上限约束。
- 会话头显示当前身份、在线人数和“群管理”；跨群页内提示、标题未读数和可选浏览器系统通知全部可用。
- **房间 AI 成员**在单一主 Agent 之上扩展：登录部署中由启用的平台超级管理员配置，无登录旧模式中仍由群主/管理员配置短职责标签、可选的长角色指令、精确 provider/model、模型真实声明的推理强度和启用开关。配置只进入插件独立的 `chatroom_agents` storage domain，与既有 `chatroom` 域物理分开。原生 `@` 菜单只把消息路由给被点名成员；每个成员拥有独立的 room+profile 持久 Session，回复以自己的名字重新进入共享消息流。`排队/运行/失败/已取消` 状态实时推送给房间客户端；登录部署中仅启用的平台超级管理员可取消正在运行的 AI 成员，且不删除配置或历史。启动与响应都有超时上限，旧配置的迟到启动会被丢弃并释放，失败/超时后下一次 `@` 可自动重建；对群成员只显示通用失败提示，底层 provider 错误仅保留在 Host 日志。

### 完整复用原生 Agent

- 原生侧栏、对话/轨迹页签、输入框、模型与权限选择、思考/工具过程、Session log、审批、问答、斜杠命令、停止/排队/转向、失败详情和重试全部保留。
- 群聊输入框右侧提供“停止”和“新会话”：停止会取消当前 Agent 回合并保留排队消息；新会话保留群聊当前 Session 和完整可见历史，先在输入框上方显示新的 AI 会话分割线，下一条消息到达后把分割线永久留在该消息之前。服务端同时持久化 AI 上下文分界点，后续模型请求仅包含分界点之后的消息。多个成员同时触发时只执行一次重置。
- Agent 运行期间保持 Think 与工具行可见；最终答案输出完成后，前面的执行过程自动合并成一个可展开的摘要。
- 持久分支从右侧分栏打开，每个分支拥有独立 Harness Session，并复用父群的人类优先回复策略：明确输入 `@AI` 会立即进入分支 Agent；开启自动回复后，其余消息由配置的判断模型决定是否回复；关闭时普通消息只在人类之间保留。分支 Session 复用群聊的原生消息包装、执行过程折叠、表情/附件和快速会议入口，同时保留自己的模型、权限、轨迹和停止能力；还支持 Markdown、`@` 候选、引用、贴表情、转发和多选，但不会继续创建嵌套群聊分支。点击抽屉外遮罩即可关闭分支，不改变父群选择。侧栏分支行用紧凑标记和父群上下文表达层级，不再依赖厚重的左侧边条，既看得出归属，也不会像第二个群聊。每个群聊默认保留最近更新的两个分支，并为更早的分支提供独立的展开/收起按钮；父群的数量与当前实际渲染的分支保持一致，不再把目录残留记录算进去，“群聊”文件夹数量则只统计顶层群聊。访问网关拒绝嵌入页面时立即切换到分支兼容视图，不再等待超时；完整 Agent 仍可在新标签打开。
- 历史图片持久保存。选用纯文本模型时，只有本次模型请求会把图片替换为确定性的说明文字，界面仍显示原图。

### 消息与富媒体

可选的 `chatroom_generate_image` 生图工具挂载到主群、分支与具名 AI 成员，不受聊天模型名称限制。仅针对已有且已授权的本机 OpenCodex 设置 `DSH_CHATROOM_IMAGE_BASE_URL=http://127.0.0.1:10100/v1`；`DSH_CHATROOM_IMAGE_MODEL` 默认 `gpt-image-2.5-flare`。上游登录与路由由 OpenCodex 管理，插件不复制 OAuth 凭据。M3 是调用同一图片引擎，不是 M3 自身输出像素。工具校验 PNG 后存入原有群权限保护的 Blob 存储，返回预览与原图下载；需要当前轮唯一的有效群成员发起，支持取消，单次一张、单宿主最多并发两次，不自动重试结果不确定的付费调用。地址留空即禁用。图库中的明确框选改图沿既有 OpenCodex `/images/edits` 路由执行，同样不改动原生命令沙箱。

- IOA、OIDC 等企业身份提供方返回的真实头像会用于消息、成员目录、原生 `@` 候选、邀请列表、私聊和群头像；没有企业头像或图片加载失败时，稳定降级为账号对应的卡通头像。
- 同一发言人的连续消息会合并为紧凑消息组：首尾气泡保留外侧圆角，中间气泡使用连接直角，每组始终只有一行操作按钮和时间占据布局高度。默认显示在最后一条，悬停前面的消息时原位切换过去，不推动整个消息流；输入框内的紧凑回复引用、扩充后的常用表情面板、消息贴表情、Markdown、图片预览以及经过认证的文件上传下载继续保留。纯文字消息跳过附件准备，立即显示并清空已经成功发送的草稿。
- 消息中的 HTTP/HTTPS 地址会立即渲染为可点击链接。识别到 `docs.qq.com` 地址后异步解析网页标题，只有获得有效标题才追加腾讯文档卡片；网页或元数据查询失败时不显示占位卡片，也不影响原始消息。官方 `doc.weixin.qq.com` 链接可通过当前平台账号独立绑定的企业微信身份补充更丰富的元数据。
- 纯图片和纯文件直接作为消息显示，不额外生成“发送了图片/文件”的占位气泡；超大图片写入 Harness 附件存储前会自动缩放。
- 全局搜索以弹窗覆盖在当前会话上，可检索当前账号可见的姓名、用户名、群聊/私聊/分支名称和聊天正文；选择结果后打开对应会话并滚动高亮消息块。
- 回复、复制、点赞、分支和转发可直接点击；完整贴表情面板、多选和仅发送者可用的撤回保留在 `…`/右键菜单，移动端使用底部操作面板。撤回后各端同步显示占位，并清理原消息的表情和多选状态。
- 合并转发由服务端从权威 Session 事件重建，保留文本/Markdown、图片、文件、引用、嵌套转发和表情计数。
- Agent 获得群聊范围内的能力查询、主动消息、文件、引用回复、贴表情、创建分支、邀请成员和撤回自身消息工具；所有操作与人类使用同一套持久记录和实时事件。

### 企业微信协作

- 集成官方 [`@wecom/cli`](https://github.com/WecomTeam/wecom-cli)，覆盖日程增删改查、参与人/闲忙/会议室，会议创建取消更新、列表详情、纪要与转写，文档搜索与权限，以及在线表格、智能表格和智能文档能力。
- Agent 使用 `wecom_schema` 读取官方运行时参数定义，再通过 `wecom_action` 执行动作；所有操作都使用当前轮发言人独立绑定的企业微信身份。人员先通过通讯录解析，不猜测或展示企业内部 ID。CLI 未授权或单次调用失败只影响对应操作，不影响插件和 Harness 启动。
- 群聊、分支和私聊输入框提供“快速会议”：使用发起人的个人企微授权创建默认 60 分钟在线会议，因此发起人就是企微会议组织者；当前会话中的其余成员逐个从通讯录解析并加入参会人，不重复邀请组织者。任何必需成员无法唯一解析时，会在真正创建会议前失败。会议卡片立即发到原会话；Solo 不显示该入口。Agent 还可以通过官方会议操作继续管理参会人。会议卡片继续使用创建者的授权从未开始、进行中自动更新到已结束；群聊或分支会议结束后，由设置页选择的总结模型根据可信会议元数据和官方纪要生成总结，并以可复制、引用、转发和多选的标准 AI 消息发回原会话。会议与文档结果以原生卡片展示标题、时间、参与人、创建者、状态和打开链接，而不是退化成纯文本。

### 账号、SSO 与私聊

- 可选本地账号密码注册、超级管理员统一建号、角色与启停、密码轮换和会话撤销；同一身份在所有群聊中复用。
- 可接入本地账号、[`dsh-auth`](https://github.com/hxy91819/dsh-auth) 或企业 OIDC 授权码流程，包含 discovery、PKCE、state 和 nonce。
- 可让未登录用户自动跳转到指定外部认证；`local=1` 始终保留本地账号应急入口。
- 账号之间支持持久私聊，只有双方可见。群聊、分支与私聊使用同一个参与者消息框，并复用同一套回复预览、表情选择、待发附件、复制、贴表情、转发和多选组件；私聊只保留独立的数据传输。Enter 发送、Shift+Enter 换行、图片、文件、快速会议卡片，以及未读数、页内提示和浏览器通知全部可用；私聊文件夹同时承担通讯录能力，点击用户会把 Harness 主会话区切换到对应私聊，随后点击任意群聊或 Solo 会话（包括原本已经选中的群聊）即可直接切回，无需额外关闭私聊窗口。

### 存储与备份

- 插件在 `$DSH_HOME/chatroom/chatroom.sqlite`（未设置 `DSH_HOME` 时为 `~/.dsh/chatroom/chatroom.sqlite`）维护独立 SQLite 聊天档案，将群聊、分支、私聊、成员关系、消息、附件元数据和撤回墓碑投影成可查询的数据表。Harness Session log 继续作为 Agent 执行与审计记录，但不再是唯一的聊天数据库。
- 文件正文不写进 SQLite，也不再塞进 KV 的 Base64 字段，而是按 SHA-256 写入 `blobs/v1/objects/` 内容寻址目录。相同文件只保存一份，附件表仍保留原文件名、类型、发送者、群聊和时间；旧版内联附件会在启动时无损迁移。
- 撤回采用非破坏式墓碑：原始记录继续用于审计，同时记录撤回人和撤回时间；所有在线端同步显示“消息已撤回”，后续主群或分支模型请求会排除对应的原始模型消息 ID。
- 备份或迁移时先停止插件，再整体复制数据目录即可。可以通过 `dataDirectory` 或 `DSH_CHATROOM_DATA_DIR` 把 SQLite 和 Blob 放到独立数据盘。

<details>
<summary><strong>近期版本</strong></summary>

- **1.5.0-codex.rc1.53（启动通知偏好）** — 每次客户端启动仅跳过原生内测通知这一格，保留其他引导；卸载插件时恢复原生贡献。这是显示偏好，不改变权限或设置存储。

- **1.5.0-codex.rc1.47（同会话 activation 重入候选）** — 同会话进行中的 latch 有界处理同步 `activateSession` 重入，但不压制真实不同会话选择。它覆盖三个后续发布窗口，另加要求身份的 prompt 同步选择 B。红→绿定向回归集通过 60/60 加 typecheck；CI r2 通过 typecheck/build、56 个 unit 文件 / 497 个测试及 16 个 browser 文件 / 93 个测试，自然 `exitCode: 0` 且源码未漂移。包、stage、部署和线上证据仍未声明；生产仍为 rc1.42。
- **1.5.0-codex.rc1.46（AI可管理群聊目录状态卡 reload 命中区）** — 完整 CI 通过 typecheck/build、56 个 unit 文件 / 490 个测试及 16 个 browser 文件 / 89 个测试；package stage 已建立不可变 bundle 证据。隔离 r1 在 768px 定位原生折叠侧栏 Settings 文字失败，Settings 未运行；原 IAB tab 1 的 AX 超时/open-panel 排队仍阻塞。它不是验收或根因闭环声明。
- **1.5.0-codex.rc1.45（legacy-auth Settings guard 与目录状态）** — 完整 CI 通过 typecheck/build、56 个 unit 文件 / 490 个测试及 16 个 browser 文件 / 85 个测试；package stage 确认 tarball 与两个不可变 bundle/source-map 一致。legacy `enabled=false` 的已认证会话不再渲染空 Settings 账户卡。目录身份/disposal 保护、明确状态、15 秒边界和 signal 接线均已纳入。隔离 r1/r2 失败仍保留；r2 到达 `303 Set-Cookie` 后 Playwright 等 response body 超时，r3 暴露状态卡 reload 点击区过小。这不是完整隔离或线上验收。
- **1.5.0-codex.rc1.44（设置布局与 RangeError 证据）** — r2 CI 通过 typecheck/build、55 个 unit 文件 / 477 个测试及 16 个 browser 文件 / 85 个测试，自然 `exitCode: 0` 且源/package 哈希未变。首轮 CI 保留：Chromium 60 秒未连上，16 个 browser 文件没有测试。随后隔离 legacy-auth 会话暴露空 AccountCard，是组件只检查 `authenticated`，旧 fixture 产生假阴性。它是保留的隔离失败，不是验收通过。
- **1.5.0-codex.rc1.43（长消息宽度与生命周期清理）** — 源码已冻结，完整 CI 通过 typecheck/build、54 个 unit 文件 / 470 个测试及 15 个 browser 文件 / 79 个测试（`RC143-check-ci-r3.log`）。长真人消息气泡不再第二次扣减已预留的头像布局空间。sidebar dispose 先设 guard，排队 reconcile/schedule 与迟到私聊目录 continuation 随后短路。首轮 CI 保留失败（53/54、469/470）；r2 在 browser 输出后触发 120 秒执行器 guard，r3 在约十分钟 teardown 后自然退出。不可变 stage 两目录哈希一致，但包内 README 是 stage 时快照。生产仍为 rc1.42；隔离/公网/IAB/reconnect 证据待完成，且不归因 IAB 根因。
- **1.5.0-codex.rc1.42（私聊对话框目录隔离）** — 完整 CI 通过 typecheck/build、54 个 unit 文件 / 468 个测试及 15 个 browser 文件 / 78 个测试。生产 overlay 在 04:40:47 / 04:41:07 重启且 PID 未变，health ready 通过。partial 公网覆盖通过 member `403`、3 个图库项、reconnect 与两次目录读取。QQ 320px 宽度 162px、Files locator 修正、定向 deep-link 30 秒超时及原 IAB 读取/截图焦点超时仍为失败；不据此声明根因或完整验收。
- **1.5.0-codex.rc1.41（QQ 折叠导航命中区）** — 源码已冻结，完整 CI 通过 typecheck/build、54 个 unit 文件 / 467 个测试及 15 个 browser 文件 / 78 个测试。QQ 伪 logo 不再在 390px 拦截原生折叠导航 toggle，brand mark 使用 `pointer-events: none`；定向 red/green visual 证据为 18/18。不可变 stage 已通过且两份 bundle 哈希一致。隔离 390px/768px 通过；保留的 320px 导航失败是疑似 Harness resize race，不据此认定根因。生产仍为 rc1.39。
- **1.5.0-codex.rc1.40（深层重入诊断与窄 composer）** — 源码已冻结，完整 CI 通过 typecheck/build、54 个 unit 文件 / 467 个测试及 15 个 browser 文件 / 77 个测试。不改变行为的诊断 helper 只捕捉无内容 frame/计数，真实 composer span/button fixture 覆盖原生形态。QQ2007 session controls 独占可换行的 `flex: 1 0 100%` 行；model 为 `flex: 1 0 80px` 且最小 80px，避免原先 8px 不可点击。包、部署、health 与线上证据仍待验。
- **1.5.0-codex.rc1.39（诊断、时序与 composer 布局）** — 完整 CI 通过 typecheck/build、53 个 unit 文件 / 462 个测试及 15 个 browser 文件 / 77 个测试。两份不可变包哈希一致；03:24:33 stop/start overlay 保持 PID 45580，health、隔离 guest、公网 member、超级管理员深链及 reconnect 通过。原 IAB 仍在服务端 9ms select 后 Welcome 并记录 `RangeError`；手动恢复房间/草稿不是因果恢复。公网 r2 的 `display: contents` 0×0 harness 假阴性、broad gallery 与 Files slot 证据仍未解决。
- **1.5.0-codex.rc1.38（实际 Host slot 与目录状态）** — stable `[data-turn-tail]` rail、真人图片上限移除、目录 pending 可见与 request-scoped session-list 已交付。完整 CI 通过 typecheck/build、52 个 unit 文件 / 447 个测试及 15 个 browser 文件 / 75 个测试；served/health、隔离 guest 与公网 member 层通过。整体公网收据仍失败：超级管理员深链选房 30 秒超时；原 IAB 保留 blank-bootstrap 失败与 `RangeError` 重入，composer model/send overlap 仍在。手动恢复仅是布局证据，不是恢复或完整验收。
- **1.5.0-codex.rc1.37（窄语义操作栏）** — QQ2007 会话容器不超过 34rem 时，原生语义操作栏允许换行，`.dsh-chatroom-assistant-tools` 使用全宽 `flex: 1 0 100%`，避免 sibling rail 将其压成 24.49px 竖列。紧凑操作规则只限 QQ2007，默认风格 320px 标签保持可见。CI、生产双阶段 overlay、health、隔离与公网 member 证据通过；公网超级管理员选房、aggregate/reconnect 与原 IAB Files 320px 仍失败，线上验收为 partial。
- **1.5.0-codex.rc1.36（受守卫的目录手动重连尾随读取）** — 慢速原生目录读取期间的显式重连重试只会在该读取结束后尾随一次，并且仅限同一当前身份/连接代次；登出、dispose、身份或代次变化都会丢弃。没有新增轮询或写操作/付费请求重放，也不声称找到了慢读根因。保留的首轮 CI 为 2 个企业微信超时、438 个通过；仅测试修正后 r2 已通过 typecheck/build、52 个 unit 文件 / 440 个测试及 15 个 browser 文件 / 72 个测试，stage/哈希也通过。隔离 320px 收据因 Harness 未展开左栏失败，Harness 修正后尚未重跑；生产仍为 rc1.35，rc1.36 未部署。
- **1.5.0-codex.rc1.35（窄栏操作、受守卫深链与原生 toggle 让位）** — 320px 中央会话栏内主 AI 操作栏按可用容器宽度排布，图标控件不换行；群聊自动回复说明区分登录部署的启用平台超级管理员与无认证旧模式的群主/群管理员。URL 选房等待首次原生目录基线，跨认证按身份 epoch 消费一次，不能覆盖 pending 的新 current 或稍后的真实原生选择。QQ Style 在 541–900px 为底部面板 toggle 预留 64px、在 <=540px 为右侧栏 toggle 预留 40px，不用 z-index 覆盖或隐藏原生控件。完整 CI、包/overlay/哈希/served-health、隔离 guest 及已限定的公网 member/连续检查证据已记录；Files、手动重连和剩余原 IAB 覆盖使线上验收仍为 partial。
- **1.5.0-codex.rc1.34（目录恢复与窄栏安全）** — 同一原生选择的目录事件不会丢弃显式选房回包；手动重连可请求一次新的原生目录读取，读取未完成时发生身份/连接代次变化则只尾随一次，不轮询。30 秒目录超时记录专用 `native.session-list.timeout` / HTTP `504` 诊断并纳入巡检，写操作仍不自动重放。已有环境代理而 Node fetch 尚未启用时，单次巡检仅为自身子进程加 `NODE_USE_ENV_PROXY=1` 后重执行，不改全局代理设置。QQ2007 紧凑规则按 Files 展开后实际变窄的会话容器生效。图库原图准备失败会释放改图按钮且不发送付费请求，失败状态不会冒充“图库为空”。
- **1.5.0-codex.rc1.33（导航与鉴权加固）** — 拒绝切房、关闭会话和换账号后的迟到账号/房间回包；统一旧身份与 AI 取消操作的平台权限，并持续复核房间长连接。媒体弹窗区分关闭、读取失败和付费提交状态未知；隐藏进展停止计时。
- **1.5.0-codex.rc1.26（按身份更新原生连接）** — 仅登录或身份改变时重建原生流，不再每次读取/首次加载成功就主动断链，也不在手动重连后再触发第二次重连。
- **1.5.0-codex.rc1.25（AI 表单布局）** — 开关与文案分离，字段字号和间距统一，异步加载不再误报空列表或无权限。
- **1.5.0-codex.rc1.24（管理弹窗与同步存活检测）** — 两个管理面板进入浏览器顶层，通知连接立即确认，命名心跳支持超时自愈，响应结束清理订阅，增加鉴权限流的逐层连接诊断；保留宿主兼容与媒体功能。
- **1.5.0-codex.rc1.23（宿主兼容）** — 兼容官方 CLI 0.1.5-rc.1 实际解析的 0.1.5-rc.2 传输/持久化组件：规范化 Session 快照、使用并关闭只读句柄，保留旧版读取路径与明确版本门禁；不修改 DSH 源码、媒体功能和账号隔离。开发依赖基线仍为 0.1.2-rc.1。

- **1.5.0-codex.rc1.22（关闭流恢复）** — 对永久 CLOSED 的消息流重新验证登录并重建，1.5–30 秒退避，两种消息流共用单次重试，隐藏/停止取消。保留浏览器 CONNECTING 自重试，不重发消息；降低改图预览高度，拒绝视频文件编号冲突。

- **1.5.0-codex.rc1.21（图库与媒体生命周期）** — 持久缩略图、完整主/分支会话图库、框选遮罩改图、MiniMax Code CN 视频与既有任务读取；关闭/隐藏中止查询、原图和视频读取，保留已提交生成。
- **1.5.0-codex.rc1.20（原图弹窗尺寸修正）** — 弹窗边框与内边距计入视口限制，两套风格均通过 320/390/926/1440px Chromium 布局检查。
- **1.5.0-codex.rc1.19（主 Agent 图片显示补齐）** — 共享房间的原生主 Agent 图片回复也使用同一套鉴权缩略图和点击原图预览；无关私人会话仍保持原生显示。
- **1.5.0-codex.rc1.18（本地头像持久化验收）** — 补齐客户端 HTTP 请求的头像字段及传递回归测试。本机公网中转正确回收断开的 HTTP/SSE/WebSocket 双端连接，并保留 Origin 安全头。
- **1.5.0-codex.rc1.17（本地媒体与连接恢复）** — 两处 AI 成员管理均支持更换头像，不中断正在运行的回合，并突出添加入口。模型写坏附件标记时仍可从明确的鉴权图片链接恢复预览；聊天默认读取最长 480×320 的 WebP 缩略图，点击再打开原图弹窗。原生长连接增加弱网心跳容忍与连接关闭/失败日志，纳入现有巡检；不修改 DSH 源码或账号权限。

- **1.5.0-codex.rc1.14（本地生图验收修正）** — 两套风格的图片下载卡均限制在消息列内；清除原生图片说明投影遗留的末尾空行。
- **1.5.0-codex.rc1.13（本地生图工具）** — 可显式启用已有本机 OpenCodex 路由，提供房间鉴权的生图工具、持久化图片预览与下载，以及有界取消和响应校验。生图通道不绕过、也不修复原生 Shell 沙箱。
- **1.5.0-codex.rc1.11（本地详情栏保护）** — 明确窄屏详情栏所在列，折叠时宽度归零，展开时覆盖显示。
- **1.5.0-codex.rc1.10（本地弹窗边界修正版）** — 表情菜单限制在窄屏可视范围内，恢复自身滚动高度限制，不再被 QQ 通用弹窗高度覆盖。
- **1.5.0-codex.rc1.9（本地移动端验收修正版）** — 修复实测发现的导航遮罩点击区域、AI 成员表单溢出、原生设置页导航占宽及输入工具栏换行问题。
- **1.5.0-codex.rc1.8（本地响应式风格版）** — QQ2007 作为初始默认并仅在该风格显示 QQ 标识；修复侧栏打开时挤窄聊天、顶部堆叠和正文/输入字号。Agent 与侧栏操作继续使用原生服务。
- **1.5.0-codex.rc1.7（本地布局修正版）** — 约束固定版本宿主不收缩的按钮容器和移动端 Agent 列表，防止两套主题中的原生控件与风格选择器互相覆盖。
- **1.5.0-codex.rc1.6（本地风格／恢复版）** — 新增持久化“默认 / QQ2007”整页换肤与顶部控件换行。已停用私聊对象不再导致整个目录报错；保留历史记录，仍拒绝直接访问停用对象。

- **1.5.0-codex.rc1.5（本地头像／对齐版）** — 按固定宿主的实际结构，让消息气泡紧靠发言者头像；消息、账号头像选择、成员列表、房间拼图及原生提及候选统一换用 100 张内置 QQ 经典位图。兼容旧头像编号，保留企业账号自有头像。素材归属及使用限制随包记录在 `NOTICE.md`。

- **1.5.0-codex.rc1.3（本地整合版）** — 整合具名 AI 独立投递、账号／房间级请求归属、成员列表超时与后台 SSE 恢复、账号退出及权限边界、手机／折叠屏容器布局与输入区适配。不改变 Harness 依赖批次或插件存储边界。验收限制见 `docs/integration-rc1.3.md`。

- **1.5.0-codex.rc1.2（本地兼容版）** — 强化房间 AI 成员：短职责与长角色指令分离、按模型真实能力生成推理强度选项、成员级排队/运行/失败/取消实时状态、成员取消、启动/响应有界恢复、迟到旧启动清理、浏览器通用安全错误提示，以及窄屏下可横向滚动的紧凑 Agent 头部。
- **1.5.0-codex.rc1.1（本地兼容版）** — 新增并强化房间 AI 成员：独立 `chatroom_agents` 存储、短职责与可选长角色指令、按模型能力生成的推理强度选项、成员级实时运行状态与取消、启动/响应有界恢复、旧配置迟到启动拒绝、通用公开失败提示，以及 room+profile 独立持久 Session；具名回复回到共享消息流且单成员故障不阻塞其他成员。
- **1.4.4-codex.rc1.4（本地兼容版）** — 群聊头部直接显示主 Agent 与真实子 Agent 名单、运行状态、续聊按钮、错误和刷新入口。子 Agent 仍使用各自的原生持久会话；此版本没有把 `@` 会话引用变成群内多 Agent 分发，也没有把所有子 Agent 回复合并为一个群消息流。
- **1.4.4-codex.rc1.3（本地兼容版）** — 修复点击原生子代理后退回空白页：前端导航复用后端会话谱系权限检查，不再把子代理误当成无主 Solo。
- **1.4.4-codex.rc1.2（本地兼容版）** — 补齐成员可用的原生子代理列表、续聊与停止接口；父子会话均验证账号权限，拒绝跨账号访问。
- **1.4.4-codex.rc1.1（本地兼容版）** — 适配 DSH 0.1.2-rc.1，不修改或降级宿主；在账号权限网关后复用原生 Typert RPC/WebSocket，迁移 Session/UI 接口，并保留消息回显请求编号。原生传输组件锁定已适配版本，遇到未验证版本拒绝加载。
- **1.4.4** — 在 Host 统一校验原生 HTTP、WebSocket 和跨会话引用权限；按模型步骤认领的结构化身份固定企微凭据与邀请权限；文件交付使用实际 Agent 文件系统；先持久保存待接纳消息，再交接原生持久队列，并在卸载时回收借用 Agent 的注册和 CLI 子进程。
- **1.4.3** — 官方会议创建操作无法覆盖当前授权账号的组织者，因此恢复按平台账号隔离的企微扫码凭据；快速会议改由发起人本人创建并邀请当前会话的其余成员，生命周期查询继续使用创建者授权，Agent 企微操作按当前已认领发言人选取凭据；旧共享凭据只用于继续跟踪升级前创建的会议。
- **1.4.2** — 把登录后的每个 Solo Session 持久绑定到创建账号；原生侧栏不再把未加入群聊或他人 Solo 错归到当前用户的 Solo，登录响应不再返回无权访问的默认群，账号状态切换前后都会清除无权访问的活动 Session，并在原生普通消息或斜杠命令绕过群成员和发送者身份前拒绝提交。
- **1.4.1** — 恢复原生主群消息流的唯一操作栏：未显式分组的原生消息由宿主流统一控制可见性，空闲时保留末条操作栏，悬停较早消息时只把这一条操作栏移动到悬停目标，不再让组内每条控制栏同时出现。
- **1.4.0** — 把逐用户企微授权收敛为设置页维护的一份部署级共享账号；加入解绑/重新绑定、会议状态跟踪、可配置 AI 总结和经过成员权限过滤的总结接口；统一群聊、分支与私聊的消息/输入基础组件；加入立即同步且不扰动当前答案、可编辑撤回与引导的 AI 接纳气泡；补齐分支主题消息的工具输出 schema；并让分支消息复用父群的人类优先自动回复判断流程。
- **1.3.5** — 面向成员的文案不再暴露实现细节：身份弹窗不再解释嵌入的对话界面，企业微信不可用改为给出下一步而不是点名 CLI，分支加载与降级提示描述分支本身而非嵌入策略，设置副标题随登录角色变化，系统提示词说明去掉自证措辞。
- **1.3.4** — 展开原生按工作区的会话截断，改由每个侧栏类别的唯一展开控件承担，其数量与类别计数一致；不再让多个原生按钮因类别压平而散落在列表中间。
- **1.3.3** — 统一群聊、Solo 与私聊的全宽输入体验，把 AI 上下文重置分割线持久保留在准确的消息位置，并加入企业微信扫码授权；快速会议兼容官方 CLI 不提供结构化真人用户标识的身份响应。
- **1.3.2** — 开启新的 AI 会话时保留群聊完整历史，并从后续模型请求中排除分界点之前的用户、助手和工具结果消息。
- **1.3.1** — 优化分支导航：收近分支标记并移除父群左侧边条；把设置导航中的通用齿轮替换为语义化群组/账号图标并保留安全降级；新增布局与设置导航的浏览器回归覆盖。
- **1.3.0** — 加入群聊“停止 / 新会话”控制，接入官方 wecom-cli 的完整 schema 驱动 Agent 工具、快速会议，以及会议/文档原生卡片；企微鉴权和调用失败继续与 Harness 启动隔离。
- **1.2.5** — 普通群聊和分支消息先落库显示，再异步运行可选的自动回复判断模型；发送不再等待判断延迟。请求模型前同时修复旧版插件遗留的工具调用/结果乱序，避免坏历史持续阻断后续对话。
- **1.2.4** — 加入插件自有的 SQLite 聊天档案与内容寻址本地 Blob，迁移旧版内联附件，在启用认证的部署中按群成员控制可见性，并让撤回后的原始消息不再进入后续 Agent 上下文。
- **1.2.3** — 共享 Session 先由 Harness 恢复、后被聊天室接管时，也会补挂群聊能力查询与操作工具，使原生恢复的 Agent 和插件新建的 Agent 拥有相同的协作能力。
- **1.2.0** — 把自动回复设置与消息接纳串行化，直接称呼 AI 时确定性唤起 Agent，加入仅发送者可用的持久撤回，移除设置页重复的私聊入口，并把完整群聊操作集开放为 Agent 可调用工具。
- **1.1.17** — 把紧凑回复引用收进 Harness 原生输入框，并在原生成员提及候选中显示 IOA/OIDC 企业头像；图片缺失或加载失败时继续降级为卡通头像。
- **1.1.16** — 以 DeepSeek Harness 0.1.1-rc.2 为主要兼容基线，新增群聊、Solo、私聊分类导航，支持带文件和表情的原生私聊、新会话模式切换、群聊置顶、AI 自动唤起设置与 AI/成员分组提及，并保留 1.1.15 的 IOA 头像和原生 Session 绑定修复。
- **1.1.15** — 增加分支主题与盒模型的 Chromium 回归门禁，并避免移动端全宽分支面板超出视口。
- **1.1.14** — 让 Harness 消息操作行随 AI 分支摘要自动增高，避免摘要与吸底输入框重叠。
- **1.1.13** — 分支面板和回复摘要跟随宿主明暗配色，并让 AI 分支摘要进入消息正常布局、稳定停留在输入框上方。
- **1.1.12** — 每个原生侧栏群头像都按权威 Session ID 绑定，同名会话、选中态变化和行重排不再导致群头像串换。
- **1.1.11** — 群聊切换时保持群头像的身份与排序稳定，并让初始房间目录直接携带企业头像。
- **1.1.10** — 贯通 dsh-auth/IOA 与 OIDC 企业头像，在所有聊天表面优先显示真实照片并保留卡通降级。
- **1.1.9** — 原生侧栏重命名持久化为群名，并为共享会话增加更高的行距和成员九宫格群头像。
- **1.1.8** — 原生分支 frame 被网关拦截时立即启用消息兼容视图，保留完整 Agent 直达入口，并把含大量 Markdown 的分支主题收敛为短标题。
- **1.1.7** — 隔离分支运行时启动时保持目标 Session，不再跳回父群聊。
- **1.1.6** — 新建或恢复分支时把分支 Session 挂载到原生 Workspace，保留的 Harness iframe 可以直接选中目标会话，不再等待到超时。
- **1.1.5** — 在原生空白 Session 首屏直接建群并勾选平台成员。
- **1.1.4** — 保证原生“新会话”创建独立 Session，并排除分支 Session 的空白会话复用。
- **1.1.3** — 移除复制邀请链接，改为直接从系统账号目录选择成员。
- **1.1.2** — 用 Harness 原生设计语言重做“设置 → 群聊与账号”。
- **1.1.0** — Harness Session 默认共享，加入账号/SSO 管理，安装 `dsh-auth` 时默认优先使用它登录。

</details>

## 环境要求

### 连接恢复与故障证据（rc1.15）

rc1.16 另外为加载失败的图片预览增加重试按钮；点击服务器重连也会重试失败的**文件读取**，不会重新生图或重放付费操作。

服务器状态灯和“重连”按钮位于原生侧栏左下角，两种风格、展开及折叠模式均可用。只有原生传输及必需的聊天/通知流恢复才亮绿灯；超过 15 秒显示连接超时，原生自动重试继续。手动重连复验当前登录并替换只读数据流，不刷新页面、不重发消息；登录过期进入原有登录流程。绿灯**不代表模型或生图接口可用**。

插件在 `<dataDirectory>/diagnostics`（默认 `$DSH_HOME/chatroom/diagnostics`）保存脱敏 JSONL：启动/停止、图片操作编号与开始/成功/失败、模型流异常、轮次结束状态。不会记录提示词、响应正文、Cookie 或密钥；写入异常在 `/api/health` 标明。保留当前及 3 份轮转文件，每份约 2 MiB；崩溃可能丢失尚在队列中的记录，`:memory:` 模式不写磁盘。

开启生图时，每 15 秒免费探测本机 OpenCodex `/healthz`（超时 4 秒），状态变化即时落盘，正常状态每分钟保留一条，包含接口进程 PID。这不等于上游付费出图验收。`scripts/chatroom-health-observer.mjs` 为独立单次巡检，检查本机/公网聊天健康、OpenCodex 健康及新增调用失败，需通过原生定时任务明确安装。主机或 Codex 应用关闭、两次探测之间的瞬时故障仍属于监控边界。

- Node.js 22.19 或更高版本
- pnpm 10.33.4
- 最低支持并验证 DeepSeek Harness 0.1.1-rc.2；持久队列和原生连接接口依赖该版本。
- Web profile 已配置可用的默认模型

### 回归门禁

`pnpm check` 负责类型检查、可观察行为测试和生产构建。CI 还会安装 Chromium 并运行 `pnpm test:browser`，验证分支面板的明暗 computed color、群聊/私聊的紧凑消息盒模型、排队消息布局与原生重复队列隐藏、分支层级、AI 分支摘要，以及设置导航的语义化/降级群组账号图标。浏览器断言使用盒模型和计算样式，不依赖易碎的截图快照。

## 从 GitHub 安装

升级旧版本时先移除原插件记录，再安装当前仓库：

```sh
pnpm dsh plugin --profile web remove deepseek-harness-chatroom
pnpm dsh plugin --profile web add github:invclaw/DeepSeek-harness-chatroom
pnpm dsh --profile web
```

安装本地检出：

```sh
pnpm dsh plugin --profile web add /absolute/path/to/DeepSeek-harness-chatroom
pnpm dsh --profile web
```

浏览器包通过插件的 `dsh.client` manifest 自动发现。新 Session 默认选择群聊，并只在第一条普通消息发送时幂等绑定为共享 Room；Solo 保持原生 Session。插件添加身份状态、三类侧栏目录、群管理、通讯录、输入候选和文件/回复控件，不替换 Harness 的主对话、详情或原生输入框。

## 配置

安装时会向 Web profile 加入：

```yaml
- id: connection
  disabled: true
- id: chatroom
  name: deepseek-harness-chatroom
  config:
    dataDirectory: !!js process.env.DSH_CHATROOM_DATA_DIR ?? ''
    roomId: lobby
    roomTitle: AI 聊天室
    aiDisplayName: DeepSeek
    sessionId: chatroom-v1-lobby
    cwd: !!js process.env.DSH_CHATROOM_CWD ?? process.cwd()
    agentPreset: standard
    settingsAdminParticipantIds: !!js (process.env.DSH_CHATROOM_SETTINGS_ADMIN_IDS ?? '').split(',').map(value => value.trim()).filter(Boolean)
    authEnabled: !!js Boolean(process.env.DSH_CHATROOM_AUTH_SECRET)
    authSecret: !!js process.env.DSH_CHATROOM_AUTH_SECRET ?? ''
    authPublicOrigin: !!js process.env.DSH_CHATROOM_AUTH_PUBLIC_ORIGIN ?? ''
    authBootstrapToken: !!js process.env.DSH_CHATROOM_AUTH_BOOTSTRAP_TOKEN ?? ''
    authAllowSelfRegistration: !!js process.env.DSH_CHATROOM_SELF_REGISTRATION !== 'disabled'
    authDshAuthHeaders: !!js process.env.DSH_CHATROOM_DSH_AUTH_HEADERS === 'enabled'
    authDshAuthVerifyUrl: !!js process.env.DSH_CHATROOM_DSH_AUTH_VERIFY_URL ?? ''
    authDshAuthLoginPath: !!js process.env.DSH_CHATROOM_DSH_AUTH_LOGIN_PATH ?? '/auth/login'
    authMode: !!js process.env.DSH_CHATROOM_AUTH_MODE ?? 'local'
    authDshAuthSuperAdminSubjects: !!js (process.env.DSH_CHATROOM_DSH_AUTH_SUPER_ADMINS ?? '').split(',').map(value => value.trim()).filter(Boolean)
    authDshAuthAvatarUrlTemplate: !!js process.env.DSH_CHATROOM_DSH_AUTH_AVATAR_TEMPLATE ?? ''
    authDshAuthAvatarAllowedOrigins: !!js (process.env.DSH_CHATROOM_DSH_AUTH_AVATAR_ORIGINS ?? '').split(',').map(value => value.trim()).filter(Boolean)
    authDshAuthRevalidateSeconds: !!js Number(process.env.DSH_CHATROOM_DSH_AUTH_REVALIDATE_SECONDS ?? 60)
    wecomEnabled: !!js process.env.DSH_CHATROOM_WECOM !== 'disabled'
    wecomCliPath: !!js process.env.DSH_CHATROOM_WECOM_CLI_PATH ?? ''
    wecomCliConfigDirectory: !!js process.env.WECOM_CLI_CONFIG_DIR ?? ''
    wecomCliTimeoutMs: !!js Number(process.env.DSH_CHATROOM_WECOM_TIMEOUT_MS ?? 30000)
    wecomQuickMeetingDurationMinutes: !!js Number(process.env.DSH_CHATROOM_WECOM_QUICK_MEETING_MINUTES ?? 60)
    wecomQuickMeetingSubject: !!js process.env.DSH_CHATROOM_WECOM_QUICK_MEETING_SUBJECT ?? '快速会议'
    wecomTimeZone: !!js process.env.DSH_CHATROOM_WECOM_TIMEZONE ?? 'Asia/Shanghai'
    wecomMeetingPollIntervalMs: !!js Number(process.env.DSH_CHATROOM_WECOM_MEETING_POLL_INTERVAL_MS ?? 30000)
```

需要调整时，在 Web profile 的 `cordis.patch.yml` 覆盖配置：

```yaml
- id: chatroom
  name: deepseek-harness-chatroom
  config:
    roomId: team-room
    roomTitle: 团队 AI 聊天室
    aiDisplayName: DeepSeek
    sessionId: chatroom-v1-team-room
    cwd: /允许房间Agent访问的绝对路径
    agentPreset: standard
    cookieName: dsh_chatroom_session
    cookieMaxAgeSeconds: 31536000
    maxDisplayNameChars: 24
    maxRoomTitleChars: 80
    maxMessageTextChars: 20000
    maxFileBytes: 20971520
    maxFilesPerMessage: 5
    maxMessageFileBytes: 52428800
    maxImageSidePixels: 4096
    settingsAdminParticipantIds:
      - 无登录旧模式远程设置的-participant-id
    maxSettingsRequestBytes: 1048576
    sseHeartbeatMs: 15000
    nativeTrustedHosts: []
    nativeMaxRequestBytes: 314572800
    authEnabled: true
    authCookieName: dsh_chatroom_auth
    authSessionMaxAgeSeconds: 2592000
    authSecret: 至少包含32个UTF-8字节的随机密钥
    authPublicOrigin: https://chat.example.com
    authBootstrapToken: 一次性超级管理员初始化口令
    authAllowSelfRegistration: true
    authDshAuthHeaders: false
    authDshAuthVerifyUrl: ''
    authDshAuthLoginPath: /auth/login
    authMode: local
    authDshAuthSuperAdminSubjects: []
    authDshAuthAvatarUrlTemplate: ''
    authDshAuthAvatarAllowedOrigins: []
    authDshAuthRevalidateSeconds: 60
    wecomEnabled: true
    wecomCliPath: ''
    wecomCliConfigDirectory: /持久化的/wecom-cli配置目录
    wecomCliTimeoutMs: 30000
    wecomQuickMeetingDurationMinutes: 60
    wecomQuickMeetingSubject: 快速会议
    wecomTimeZone: Asia/Shanghai
    wecomMeetingPollIntervalMs: 30000
```

### 账号权限与消息交接

安装补丁禁用原生 `connection` 条目，由聊天室提供带账号授权的 HTTP/WebSocket 传输；浏览器仍运行固定依赖的原生连接实现。不要同时重新启用原生条目。服务端逐请求、逐事件校验群成员或 Solo 归属，过滤会话目录和引用候选，并检查原生提示、附件、导出、审批回应和跨会话引用。未知 Remote 默认拒绝；部署设置、凭据和全局插件检查目录仅管理员可操作。

聊天室是共享 Harness 工作区中的协作与会话权限层。Agent 仍遵循部署的文件系统、Shell 和权限策略；需要互不信任租户的进程或文件隔离时，使用独立 Harness 实例。

Agent 的企微工具和邀请操作使用当前模型步骤已认领消息的结构化发起身份。普通旁观消息不会替换执行中的身份；同一步含多个发起人时，要求个人身份的操作会拒绝，需由一位用户单独发起。登录部署的邀请只允许启用中的平台超级管理员；无登录旧模式保留群主/群管理员邀请权限。工具在调用开始时固定凭据所有者，会议后续查询沿用该所有者。

Agent 文件交付通过该 Agent 的 `ctx.fs` 解析真实路径，以原生 Session 的 `cwd` 为根，执行目录包含检查、读取大小限制与取消；指向根目录外的符号链接会被拒绝。

每条人类消息先写入 `chatroom` storage domain 的接纳记录。原生持久队列负责调度；接纳记录一直保留到消息被认领、写入原生 `user/message` 并完成日志刷新，防止宿主销毁 Agent 时取消队列导致丢失。恢复按消息 ID 去重，不自动执行尚未认领的消息；发送者可点击“引导”继续，也可编辑或撤回。被中断的自动回复判断恢复为普通聊天，不自动重试不确定的外部操作。完整备份需保留聊天归档、`chatroom` domain 所配置的存储后端数据和 Harness Session 数据。撤回与 AI 上下文分割线由 domain 保存，单独导出 Session 日志不能恢复这些过滤设置。

卸载会撤销附加到借用 Agent 上的工具、系统提示和步骤监听，取消判断请求、关闭连接并等待 CLI 子进程退出；保留原生 Agent 的生命周期所有权。

### 企业微信授权

依赖会随插件一起安装，不需要全局安装 CLI。平台账号需要授权时从“快速会议”启动自己的企业微信扫码流程；未授权发起人会看到个人扫码弹窗，完成后自动继续刚才等待的会议。普通账号不需要打开设置页即可启动此流程；可用账号面板仅解绑或重新绑定当前账号。官方 CLI 加密凭据写入 `wecomCliConfigDirectory/accounts/<participant-hash>/`（未配置时写入聊天数据目录的 `wecom-cli/accounts/`），容器部署必须持久化其上级目录。原部署共享凭据不会分配给新用户，只为升级前已经创建的会议继续完成生命周期跟踪。某个账号未授权时，只暂停该账号的快速会议和 Agent 企微操作；普通群聊、Agent 和其他已授权用户不受影响。

### 会议状态与总结接口

插件每隔 `wecomMeetingPollIntervalMs` 刷新仍在进行的会议。首次以 1.4 启动时，会按会议链接从持久群聊、分支和私聊历史中恢复 1.4 之前的会议卡片，因此已经创建的会议也会补上生命周期更新和一次结束总结。群聊和分支会议结束后只生成一次总结并追加到原会话；私聊会议的总结可查询，但不会广播到无关群聊。“设置 → 群聊与账号 → 会议总结模型”选择后续总结使用的模型，模型只接收经过筛选的会议字段和企业微信官方纪要。

已认证客户端可通过 `GET /plugins/deepseek-harness-chatroom/api/meetings/:id` 查询单场会议，通过 `GET /plugins/deepseek-harness-chatroom/api/meetings/summaries` 列出已完成总结。每条记录包含插件公开会议 ID、来源会话类型/ID、生命周期与总结状态、时间和总结正文；响应不会暴露企微内部会议 ID，调用者必须属于原群、分支所属群或原私聊。

`authSecret` 用于加密 OIDC Client Secret，必须稳定保存在 Git 之外。本地密码使用带随机盐的 scrypt，允许 6–128 个字符。第一次密码注册必须填写 `authBootstrapToken`，该账号会成为初始超级管理员；后续注册遵循“系统管理”里的动态策略。登录失败有内存限流，停用账号会撤销其全部会话，修改密码会轮换当前会话并撤销旧会话。认证 Cookie 是随机值，服务端只保存 SHA-256 摘要，使用 `HttpOnly`、`SameSite=Strict`、根路径，并在 `authPublicOrigin` 为 HTTPS 时加上 `Secure`。

### 企业 OIDC 与 dsh-auth

OIDC 提供方在 Harness 原生“设置 → 群聊与账号”中添加，界面显示的回调地址必须原样登记到企业身份平台。发现与授权码交换使用 OIDC discovery、PKCE、state 和 nonce；Client Secret 使用 `authSecret` 派生的 AES-256-GCM 密钥加密，不会回显到管理界面。部署 dsh-auth 时它会成为初始默认入口；没有 dsh-auth 时，唯一启用的外部认证会成为默认入口。超级管理员可以改选其他提供方或恢复登录选择页。`local=1` 应急入口仅适用于 `hybrid`/`local` 模式。

要在保留本地多用户账号的同时复用 [`dsh-auth`](https://github.com/hxy91819/dsh-auth)，需让它的 `/auth/*` 路由继续在同一公网 Origin 可访问，并将 `DSH_CHATROOM_DSH_AUTH_VERIFY_URL` 指向它的回环 `/auth/verify`（如果插件运行在同一个 Harness listener，通常为 `http://127.0.0.1:3080/auth/verify`）。聊天室只把浏览器中的 dsh-auth Cookie 转发给该回环校验接口，并把验证成功的账号导入为普通成员；`authDshAuthSuperAdminSubjects` 中列出的 subject 才是全局超级管理员。生产环境可设 `authMode: dsh-auth-only`、关闭自主注册并将复核周期保持为 60 秒；此模式隐藏本地密码和 OIDC 入口，并在上游会话撤销后拒绝访问，`local=1` 应急入口仅适用于 `hybrid`/`local` 模式。`DSH_CHATROOM_DSH_AUTH_HEADERS=enabled` 仅适用于受信任网关兼容场景，网关必须先删除客户端伪造的同名 Header。头像只保存 HTTPS URL；可用 `authDshAuthAvatarUrlTemplate` 并配合 `authDshAuthAvatarAllowedOrigins`，加载失败自动回退内置头像。

### 整站网关保护

仅启用插件账号 API 并不能自动保护一个直接暴露公网的 Harness。生产部署必须让 Harness 只监听回环地址，并在公网 TLS 代理中完成以下规则：

1. 公网直接访问 `/plugins/deepseek-harness-chatroom/api/auth/verify` 固定返回 `404`。
2. 只放行明确的登录、注册、退出、`/auth/page`、`/auth/providers`、OIDC 与 dsh-auth 回调路由。
3. 其余 Harness 页面、静态资源、API、插件、SSE、下载和 WebSocket 都先向上述 verify 地址发起内部 `forward_auth` 子请求。
4. 用 `X-Original-URI` 传递原始地址；只对顶层页面请求把 `401 + X-Dsh-Auth-Login` 转成 `303`，并把校验响应中的 `Set-Cookie` 返回浏览器。
5. 删除客户端传入的 `X-Dsh-Auth-User-Id`、`X-Dsh-Auth-Subject`、`X-Dsh-Auth-Username`、`X-Dsh-Auth-Display-Name`、`X-Dsh-Auth-Picture` 和 `X-Dsh-Auth-Roles`，再复制校验通过的值。缺少后四个资料 Header 时认证仍可用，但聊天室只能显示账号名和卡通头像。

校验成功返回 `204` 和服务端身份 Header，未登录返回 `401` 和独立登录页位置。认证提供方异常不会阻碍 Harness 启动：插件路由仍会立即注册，自己的存储未就绪时返回 `503`，OIDC 或 dsh-auth 登录失败只影响对应登录请求。

登录部署只有启用中的平台超级管理员可读取和修改部署配置；`settingsAdminParticipantIds` 不再提升已登录账号权限。服务端使用 Cookie 解析当前账号，修改显示名称或头像不会改变权限。模型设置请求仍需通过同源检查。

`sessionId` 是升级前大厅继续使用的持久 Session。已登录账号创建的原生 Session 先记录为该账号所有；选择群聊后，第一条普通消息按 Session ID 幂等建立共享群记录，不创建第二套会话；登录部署中由启用的平台超级管理员在顶层群管理对话框把启用的平台账号直接加入当前群聊，无登录旧模式保留群管理者路径。每个分支仍获得独立持久 Session。聊天室文件、成员、表情贴附、分支元数据、分支消息和分支引用保存在同一个 `chatroom` storage domain。房间 AI 成员配置保存在独立的 `chatroom_agents` storage domain（独立落盘文件），不进入旧 `chatroom` 域，旧域的表结构与版本保持不变。

API 路由会立即注册，在存储和 Session 就绪前返回 `503`。初始化失败时，网页静态资源仍可加载，但聊天室和原生会话操作保持关闭；修复存储或 Session 错误后重启插件。

## 浏览器身份与安全

认证关闭时，旧版浏览器身份仍使用仅作用于聊天室 API 的随机 256 位 `HttpOnly`、`SameSite=Strict` Cookie；它只能标识参与者，不构成访问控制。认证启用后，前述账号 Cookie 是群聊、文件、图片、模型设置管理、通知和私聊的唯一身份依据。

显示名称只是房间展示身份，不是账号认证。远程模型设置授权只比较服务端从 HttpOnly Cookie 解析出的不透明 `participantId`，不相信可修改的显示名称。配置代理沿用 Harness API Proxy 的 schema 校验、机密脱敏和 revision 冲突检查；密钥值只允许写入且不会回传，Session 操作按归属或群成员授权，部署配置与文件系统管理仅管理员可操作。所有能进入房间的人仍能向所选 Agent preset 提交输入，并可能使用该 preset 提供的工具。面向非完全可信成员时，应使用受限 preset 和范围尽可能小的 `cwd`。

## 验收

1. 打开 Harness Web 并完成登录或首次身份设置；页面不应出现右下角“共享会话”按钮。
2. 点击 Harness 原生“新会话”；原生欢迎页应显示默认选中“群聊”的“群聊 / Solo”开关，不出现命名或拉人表单。群聊发送第一条普通消息后进入侧栏“群聊”，切换 Solo 后发送消息则进入“Solo”；两者都保留对话/轨迹、原生输入框和 Session log。
3. 以启用中的平台超级管理员打开原生“设置 → 群聊与账号”，确认账号、注册策略和 SSO 均可管理，不再出现插件自绘系统管理弹窗。
4. 用无痕窗口或另一个浏览器登录 `Bob`，让该平台账号进入群管理可选目录。
5. Alice 发送普通文字，两个页面应立即同步，且 AI 不回复；输入 `@` 时应同时看到 AI 和 Bob，提及 Bob 不触发 AI，提及 AI 才会获得回复。
6. 点击真人消息下方“回复”，输入区应显示引用；发送后两端显示同一引用卡片。
7. 通过“表情”插入一个表情；再分别发送纯图片和纯文件，消息中应只有图片或文件卡片，不应出现“发送了……”文字气泡；另一端应能下载完整原文件。
8. 执行 `/new` 等内置斜杠命令，并完成批准授权、问答交互、停止/排队/转向等原生流程。
9. 以启用中的平台超级管理员在会话头打开“群管理”；从系统账号目录搜索并勾选 Bob，直接加入当前群聊，顶层对话框随后应显示双方头像和在线状态。登录部署中 Bob 即使成为群管理员也不得因此获得管理权限；刷新后成员、名称和角色应保持。（无登录旧模式可另行验收群主/管理员管理路径。）
10. 在真人或 AI 消息的 `…` 菜单点击“分支”，右侧应打开完整 Harness 原生会话。确认模型选择、权限模式、图片/文件、停止/转向、斜杠命令、审批、问答、Think/工具轨迹和失败重试均存在；关闭自动回复时，直接输入“你好”只保留真人消息，输入“@AI 你好”才启动当前分支 Agent；开启自动回复后，普通消息应先经过配置的判断模型。输入 `@` 仍应看到 AI 和当前群成员，Agent 回答只进入分支。对任意分支回复执行复制、引用、贴表情、转发和多选，且分支消息不能继续发起群聊分支。连续发送 4 条消息后关闭分栏，根消息下方应显示总回复数和最近 3 条。
11. 打开任意真人或 AI 消息的 `…` 菜单选择“多选”，确认所有消息左侧都出现复选框；直接勾选包含 Markdown、引用、图片、文件和表情贴附的多条消息并合并转发到“项目二”，目标群的可展开记录卡片应原样保留这些内容。
12. 切换到其他共享群，不应重新询问显示名称或头像。
13. 在群聊历史已有图片的前提下切换到不支持图片的文本模型，分别在主群和分支发送 `@AI 总结`；两处都应正常回复，历史图片仍应显示。
14. 刷新并重启 Harness；身份、共享会话目录、成员、表情贴附、分支和各 Session 上下文都应继恢复。
15. 以启用中的平台超级管理员从远程地址打开“设置 → 模型”；提供方目录和编辑卡片应正常加载。普通成员、历史 `admin`、白名单账号和群主/群管理员均不应出现设置入口，且其配置/模型/预设请求应收到 `403`。
16. 分别用 Alice 和 Bob 登录两个浏览器；从各自的“快速会议”确认需要时出现的个人企业微信二维码与授权状态相互独立。Alice 的授权、解绑或重新绑定不得改变 Bob；普通账号无需设置入口即可发起该流程。
17. 把 Alice 和 Bob 放在同一个群聊，先由 Alice 创建快速会议：企微中的组织者必须是 Alice，Bob 必须收到邀请，旧部署账号和非群成员都不能出现。再由 Bob 创建一次，组织者和受邀人应互换。
18. 分别从分支和私聊创建快速会议：分支必须邀请父群中除发起组织者外的所有成员；私聊必须邀请另一方。未绑定的发起人应看到个人扫码弹窗，扫码完成后刚才等待中的会议应自动发出。
19. 让一个必需参会人在发起人的企微通讯录中不存在或无法唯一识别；系统必须在会议创建操作前失败，提示无法识别的显示名称，并且不能在会话里留下虚假的会议卡片。
20. 先从 Alice 已认领的消息触发 Agent 企微操作，再从 Bob 的消息触发；两次必须分别使用对应发言人的独立授权。未绑定的发言人只应收到个人扫码提示，不能回退到旧部署账号。

健康检查位于 `/plugins/deepseek-harness-chatroom/api/health`。直接部署 Harness Web 时也可使用 `/chatroom/api/health`。房间就绪时返回：

```json
{"ready":true}
```

## 开发

```sh
corepack pnpm@10.33.4 install
corepack pnpm@10.33.4 run check
```

## 候选版手机与折叠屏适配

独立候选版加入插件自有响应式样式：设置表单按实际容器宽度排版，宽容器可并列两列卡片，窄容器自动堆叠字段；640 CSS 像素及以下，仅展示群聊设置的原生弹窗切换为顶部横向导航，不影响其他原生设置。手机或粗指针设备采用 44px 操作目标、安全区间距和可读输入字号；矮横屏减少消息区多余留白，紧凑输入操作仍保留无障碍名称。

这是视口／容器适配，不是硬件铰链检测。Chromium 已覆盖 320–1440px、矮横屏及展开／折回草稿保留；真实折叠铰链、软键盘、Safari 和最终部署宿主仍需实机／集成验收。不修改 Harness 源码或数据库。详见[整合验收边界](docs/integration-rc1.3.md)。

## 候选版后台连接与列表恢复

标签进入后台后，即使会话响应迟到，也不会重新占用房间和通知的 SSE 长连接；回到前台再恢复连接。AI 成员列表读取超过 15 秒会结束等待、释放禁用控件并提示重试，不自动重试配置写入。

## 许可证

代码：[MIT](LICENSE)。内置腾讯 QQ 经典头像不适用 MIT，素材归属及使用限制见 [NOTICE.md](NOTICE.md)。本次为 QQ2007 时期沿用的经典头像精选，来源是原版 QQ2006 素材，不宣称收齐 QQ2007 专属头像。
