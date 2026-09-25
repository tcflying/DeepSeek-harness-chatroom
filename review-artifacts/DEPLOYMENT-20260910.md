# rc1.3 整合部署与验收记录

日期：2026-09-10（北京时间）。授权：整合现有插件改动，提交、推送、合并并部署。保持插件独立，不修改 Harness 源码，不手工编辑数据库，不替换用户模型、账号或凭据。

## 已提交、合并、部署

- 插件版本：`1.5.0-codex.rc1.3`。
- 整合提交：`def666996b97b2b37f169ad777f247eb99fb99e3`，60 个文件。
- 远端主分支合并提交：`c4ac9093b784c20b2b3bf061e10fcad025eccf4f`。
- 个人 fork PR：https://github.com/tcflying/DeepSeek-harness-chatroom/pull/1 ，已合并；没有向上游仓库提交 PR。
- PR CI：https://github.com/tcflying/DeepSeek-harness-chatroom/actions/runs/34468430802 ，check 通过，耗时 1m59s。
- 合并后的 main push CI：https://github.com/tcflying/DeepSeek-harness-chatroom/actions/runs/34468640979 ，同一合并 SHA，completed / success。
- 源码、测试、dist 和双语公开文档已推送。本机 AGENTS 协作补充、CodeGraph、review-artifacts、凭据与数据库未公开。
- 原源码工作树仍保留，不切换或重置其 main，也未覆盖它的未提交工作。
- 正式包：`C:/Users/datoo/.dsh/plugins-src/deepseek-harness-chatroom-1.5.0-codex.rc1.3.tgz`。
- 正式 profile：`C:/Users/datoo/.dsh/chatroom-server/profiles/web`；package.json 与锁文件已读回，均不再引用测试目录。
- 已安装插件：上述 profile 的 `node_modules/deepseek-harness-chatroom`，实际独立目录，不是开发源码链接。
- 回退备份：`C:/Users/datoo/.dsh/service/backups/integration-rc1.3-Production-20260910-190233`，包含旧插件及 profile 配置、包清单和锁文件；旧 rc1.2 包保留。
- 安装回执：`integration-production-install.log`，原生提权执行退出码 0；现有 Servy 服务正常停止并重新启动。

## 构建及审查证据

- 最终 `pnpm run check:ci`：323 项单元测试 / 29 文件通过；43 项 Chromium 测试 / 9 文件通过；类型检查、Host/Client 构建通过。
- 独立只读审查发现的两个 P1 均先用回归复现，再修复并复核通过：
  1. activation pending → cancel → immediate re-@，旧派发误释放新 binding，使真实回复投影被丢弃。
  2. running binding → cancel/update → dispose 尚未注销 → immediate re-@，新派发从 Harness 借到正在退出的旧实例。
- 修复机制：activation 绑定 execution generation；异代等待旧 activation 清理；所有运行实例退休先登记 barrier；新派发等待释放完成并重验 generation；取消与更新只处理当时已有的输入集合。
- 新增三条回归验证新请求投递、新模型路由、旧回复拒绝和新回复投影。修复前分别失败在回复未投影、旧 followup 收到第二次调用的断言。
- 包文件列表已检查。`pnpm pack --dry-run --ignore-scripts` 不支持该参数组合，使用 `npm pack --dry-run --ignore-scripts --json` 检查发布面，再由固定 pnpm 版本打包。

## 安装身份与服务

| 对象 | SHA256 / 状态 |
| --- | --- |
| 正式 tgz | `da95081d980665c0eca5bf46ef31e6ba0e50e3cd4dadccb32a36b40709f037b3` |
| 安装后的 dist/index.js | `d462b5669b05f2635ce68b8188aa2da105adf8857db88822a873d08fcfab620c` |
| 安装后的 dist/client.js | `a9c6e2b8e36c59c500161ee8dbd30cd25f2d40312553f4402048aa09c40a1f05` |
| dsh-chatroom | Servy Running，127.0.0.1:3181 唯一监听 PID 97684 |
| dsh-chatroom-lan | Servy Running，3182/3183 由既有 Caddy PID 82424 监听 |

安装文件与本次构建逐项一致；依赖和 peer 依赖保持原批次，Harness 为 `0.1.2-rc.1`。部署脚本核对的 Harness CLI 文件摘要前后不变。本次没有重装或升级 Harness。

正式服务已观察到 restart-recovered，不声称本次做过操作系统重启或长期稳定性验证。一次性 3186 测试实例在验收后停止；未把它转成长驻服务。诊断仅通过独立临时插件，未注入正式服务；本次产生的临时登录 URL 输出日志已清理。

## 真实业务证据

- 3181 本机、3182 局域网、3183 局域网 HTTPS、talk.opcvip.net 公网：实际账号登录、房间读取、认证状态读取及退出成功。
- 本机接口通过，公网访问需要当前已配置的系统代理；Node 首次直连报 `ECONNRESET`，启用其原生环境代理支持后公网登录/读取/退出全部通过。未改系统代理。
- LAN HTTPS 的 curl/Schannel 检查报 `CRYPT_E_NO_REVOCATION_CHECK (0x80092012)`；使用已存在的 Caddy 根证书进行 Node 证书链与主机名校验后，HTTPS 账号业务通过。没有关闭 TLS 校验或更改系统信任。
- 3186 隔离实例：两名 `minimax-cn / MiniMax-M3 / high` AI，连续两次具名提及，4/4 真实回复投影回群；两次提交耗时 67ms、80ms。
- 3181 正式实例：同样两名 AI、连续两次提及，4/4 真实回复投影回群；两次提交耗时 76ms、105ms。结束时两名 AI 均 idle，随后取消验收实例，避免遗留模型任务。
- 正式验收房间：`f9cb9dc4-23b6-46ad-b7ff-3944cced19ce`；唯一标记 `RC13-1789038188919`。
- 正式原生压缩 Session 日志只读解码确认四条 `assistant/message`，来源均为 `minimax-cn / MiniMax-M3`，不是 mock 或发送回执。
- 本次不是高并发吞吐量基准，也不是所有模型/账号组合的全面验收。

## 故障归因与限制

### 隔离实例启动 503（已恢复）

触发因素是本次临时 launcher 使用了 agents-home，而原有 lobby Session 的 cwd 是 `G:/codex-project/dsh-chatroom-next`。归因证据为诊断日志的原始错误：`cannot attach session 'chatroom-v1-lobby' to workspace ... its cwd resolves to 'G:\\codex-project\\dsh-chatroom-next'`。Harness 拒绝跨目录挂载，插件启动失败后保持 not-ready，不会擅自重写 Session。将 launcher 恢复到既有 cwd 后出现 `AI chatroom "lobby" is ready`，且随后 4/4 模型业务通过。正式服务的原始 cwd 本来正确，未改数据库。

### 仍存在的慢响应

正式验收甲的两个原生 step 分别耗时 48.951s 和 52.218s；文本 delta 约 3.2s 已到，但 block-end / finish 在其后又延迟约 45.785s / 48.985s。乙的两步分别约 2.066s / 1.234s。群聊当前在完整 `assistant/message` 到达后投影，第二次输入还需等待前一次原生队列结束，因此最后一条投影显著较晚。

这限定了本次延迟发生在已接收输入之后、原生流结束及完整消息投影之前，不能进一步断言是 MiniMax 服务内部、网络还是适配层的根因；缺少同一请求的上游线级耗时。未发生丢失，且在当前响应期限内完成，不能用自动重试或换模型掩盖等待。新增增量流式投影属于另一个行为变更，不包含在本次既有优化的整合部署中。

### 未完成的 CDN 与真实界面验收

- 公网两组版本化插件合并资源各取样两次，均 HTTP 200 / gzip / `public, max-age=31536000, immutable`，但 CF-Cache-Status 仍为 DYNAMIC。
- 主合并资源解压后 4,161,711 字节，两次 TTFB 2.780s / 1.786s；另一组 18,683 字节，0.902s / 0.851s。这是少量当前线路采样，不是整体速度保证。
- `/api/health` 实际 GET 为 200、ready=true、no-store、DYNAMIC；未对私人接口设置共享缓存。
- 当前浏览器控制面两次返回 `nodeRepl.fetch request failed`，没有可操作浏览器；Cloudflare 配置工具也未提供。没有读取/改写现有 Cloudflare 规则，不能盲目添加覆盖性缓存策略。
- Chromium 布局测试通过不替代真实 Host 页面；本次未完成安装后内置浏览器交互、真实折叠铰链、软键盘或 Safari 验收。
- 未继续原因：真实界面与 Cloudflare 规则变更缺少可用控制面；流结束更细根因缺少上游请求时间线，且本次不更换用户模型或新增流式显示协议。下一步：浏览器连接恢复后验证真实页面，并核对 CF 现有规则后仅为公开版本化合并包添加缓存资格；慢流问题采集同请求上游时间线，再决定是否单独实现增量投影。

本记录由 delivery-check 的分层验收要求组织；审查中确认的插件竞态已在部署前修复。未完成项保留，不宣称所有访问速度与界面问题全部闭环。
