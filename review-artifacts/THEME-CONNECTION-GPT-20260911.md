# talk.opcvip.net：风格、连接与 GPT 工具链验收

日期：2026-09-11，Asia/Shanghai。对象为本插件和现有公网服务；不修改 DSH 源码，不提交或推送仓库，不改变其他客户端、代理服务或账号。原会话、头像及既有未提交工作保留。

## 已交付：插件主题和私聊目录修复

- 正式安装版本：`1.5.0-codex.rc1.7`，固定宿主 `0.1.2-rc.1`。右上角“风格”支持默认 / QQ2007；覆盖宿主主题变量、标题栏、侧栏、标签、消息、按钮、输入、菜单和设置。它是适配现有功能的 QQ2007 风格，不是原客户端逐像素复刻。
- 仅插件代码和构建产物实现换肤；主题按站点持久保存，支持跨标签同步，保存失败提示“本次有效”。默认恢复宿主原色彩、字体与明暗偏好。顶部防重叠布局在两套风格下保留。
- 原页面私聊目录每约 2 秒返回 422：`私聊对象不存在或已停用。`。历史私聊含已停用对端时，目录整体映射抛错，前端重试仍请求同一无效目录，不能自愈。
- 目录跳过已停用对端但不删历史；旧缓存私聊 ID 的消息、文件和反应在任何持久化之前拒绝。重新启用后历史保留。
- 独立只读审查发现 cached-ID 写入后抛错风险，补上 guard 后复核无阻断项。

## 验证层次

- 本轮完整 `check:ci`：331 项单测、50 项 Chromium 测试通过。之后补 cached-ID guard：73 项 room 测试通过；真实宿主发现按钮不收缩容器后补回归，再构建并跑全部 50 项 Chromium 测试通过。
- 浏览器回归模拟固定宿主的真实 action wrapper，验证两种风格在 320 / 390 / 768 / 926 / 1440 宽度下控件不出界、不互相覆盖；真实原生页面验收宽度为 926px，不把模拟视口当作用户手机实测。
- Codex 内置浏览器原标签 `https://talk.opcvip.net/`：QQ 主题刷新后保留；切回默认的 body 色彩、字体、header 背景、原生颜色变量和 light color-scheme 与切换前一致；未发送草稿不丢失。验收草稿随后以键盘清空，发送按钮禁用，未向原群发送测试内容。
- 原会话控件实测：侧栏折叠/展开时全部 header 按钮在视口内，交叠对数为 0；AI 成员面板加载原有 2 个成员；原生设置仍保留“跟随系统”。QQ 设置背景 `rgb(244,249,255)`、边框 `rgb(113,153,196)`。最终保留 QQ2007 预览，可随时切回默认。
- 公网重新加载：`/api/remote.mux` WebSocket 握手 101，原页面显示在线，`/plugins/deepseek-harness-chatroom/api/direct` 从 422 恢复 200。
- 已登录 API 探测：登录 200、房间列表 200、模型提供商 200、登出 204。某次公网探测登录耗时约 9.2 秒，其余约 1.6 秒；不能宣称公网延迟已解决。
- 隔离宿主 3186 曾加载 rc1.6 并 health 200；IAB URL 策略 `net::ERR_BLOCKED_BY_CLIENT` 拒绝本地地址，未绕过策略。最终 GUI 验收使用原公网域名。一次性 3186 进程已停止，空白测试标签已关闭。

## 部署及回退证据

- 现有 Servy `dsh-chatroom` 为 Running / LocalSystem；本次最终核对服务 PID 52772，唯一应用监听 PID 3992，127.0.0.1:3181；应用 health 200 / ready true。此为本次重启恢复证据，不是重启电脑后的验收。
- 最终包：`C:/Users/datoo/.dsh/plugins-src/deepseek-harness-chatroom-1.5.0-codex.rc1.7.tgz`。
- SHA256：`2be76a4fd840129dd276b8405df648474a9c97f6751345b069cddf7286761808`。
- 正式安装 index.js SHA256 `7f2620c93f291ea1a02b55322b0ef4b3a511a5fb65f2a43fac73130ec3453d1f`；client.js `9131bd905474c25c083ed8ba28a39a823ae6d81bba07799080d502d7218c5f08`；均与工作树构建相同。依赖、peer 约束未改变，安装脚本校验 DSH bin.js 摘要未变。
- rc1.7 前备份：`C:/Users/datoo/.dsh/service/backups/integration-1.5.0-codex.rc1.7-Production-20260911-041216`。
- 本轮初始 rc1.5 回退源：`C:/Users/datoo/.dsh/service/backups/integration-1.5.0-codex.rc1.6-Production-20260911-040628`，保留对应 rc1.5 tgz。
- 安装日志：`style-rc1.6-production-install.log`、`style-rc1.7-production-install.log`。既有 Harness peer 缺省警告不能单独当作宿主加载失败；真实 bundle/health/UI 验证均通过。

## GPT：已修参数兼容，尚未恢复生图

原群 `全国可飞69` 的 `妈咪2号` 使用 `oc-gpt6-low / gpt-6-astra / low`；不是主输入框显示的 MiniMax 模型。

故障归因及证据：

1. 原生 Session 记录多次 `pwsh` 调用把可选 `sandbox_permissions` 填成与当前权限相同的 `workspace-write`，返回 `sandbox escalation to "workspace-write" is not strictly wider than this call's current "workspace-write" mode`。另一次扩大权限请求被取消，未以关闭沙箱重试。
2. 仅在现有服务 settings.yaml 的 `oc-gpt6-low` 添加原生支持的 `compat.supportsStrictMode: true`，使当前 Responses adapter 可以显式发送 `strict: false`；其他模型、账号和接口未改。精确文本差异读回仅此配置。
3. 使用原有验收账号新建隔离群和同配置 GPT 成员，实际执行一次 `pwd` canary。Session 的真实 tool/call 现在为 `{"command":"pwd","description":"Show the actual current working directory"}`，正确省略两个可选字段。仅证明这条实际请求的参数恢复，不代表全部 GPT 档位均已验证。
4. 下一层真实工具错误为 `SANDBOX_UNAVAILABLE`：`windows-acl-run: CreateRestrictedToken prerequisite failed: no logon SID found among 4 token groups`。现有服务运行于 LocalSystem，Windows 限制令牌后端不能启动；命令安全拒绝执行，未伪报 pwd 成功。没有切换 danger-full-access、关闭沙箱或改 DSH 源码。
5. 原 GPT request/header 的实际工具列表中没有图片生成工具。`read_image` 只是读取图片；此前没有真实生成调用或图片产物。因此当前失败不是内置浏览器无法显示已生成的图片。

配置备份：`C:/Users/datoo/.dsh/service/backups/settings-before-gpt-strict-20260911-0352.yaml`，原 SHA256 `bb486d57d4ad676c05b453ceff0d22a7ab6016e78325ae8515772d9484fed539`。

原 GPT Session：`C:/Users/datoo/.dsh/chatroom-server/sessions/--C-Users-datoo-.dsh-chatroom-workspace--/chatroom-agent-v1-session-kw7C5Q3aXGHGqiTJhABGKFmY-17adeaef-a3a9-4bd2-89ec-09f796154dbf/session.jsonl.zstd`。

Canary Session：同目录 `chatroom-agent-v1-32f6749e-ae13-4f09-8d1b-5cf325a48f68-535356ba-3ecf-4afa-9c95-95560479f210/session.jsonl.zstd`。验收成员已取消、验收账号已登出，保留证据；未用 Codex 自己的生图工具冒充 DSH 生图验收。

## 未完成及恢复条件

- 用户外网设备持续“连接中”：当前原 IAB 无法复现永久连接中，能证明当前公网链路可连接，不能把目录修复当作原外网设备问题的已证根因。尚缺故障设备截图、网络类型及失败时的 WS 请求/错误；已询问，未收到信息。
- GPT 实际出图：尚缺可接入 DSH 的图像生成工具/API 与可用授权配置；Windows 沙箱还需要具有合适登录身份的服务运行方案。现有常规用户服务账号需在系统安全界面配置凭据；不能在聊天里收集密码，也不能用取消限制来绕过故障。尚未修改服务身份或验证该方案。
- 未继续原因：外网故障设备证据尚缺；真实生图工具/接口未接入，现有 LocalSystem 的原生沙箱实际拒绝执行。下一步：取得故障设备信息以区分网络/认证/WS 问题；确认使用的图像接口与授权，并通过受支持的服务账号设置保留沙箱后，做原群真实图片生成、显示和下载验收。
