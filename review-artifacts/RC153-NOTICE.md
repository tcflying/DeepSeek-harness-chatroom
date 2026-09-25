# 启动内测声明永久关闭 · RC153

范围仅为本轮要求的启动通知。没有恢复 RC152 遗留网络查因或其他业务，没有更改 DSH 源码、账号权限、TUN、代理或凭据。

## 原因与修复

已安装 Host 的 `@deepseek-ai/dsh-client-ui-settings-models/lib/client.js` 明确区分本机持久设置和远程 `memory` 模式。外网页确认只写 `localAcknowledged`；刷新即失效。服务器 `settings.yaml` 已有 `ui-onboarding.welcomeNoticeVersion: 2026-08-13.1`，不能解决远程页面的内存模式。

Chatroom 客户端通过原生 `settings.onboarding` 插槽，只以较高优先级替换 `welcome-notice` 这一格；组件完成当前步骤而非隐藏所有弹窗，也不改 settingsScope 权限。每次页面启动自动生效，不依赖浏览器本地存储或通知文案版本。插件卸载后恢复原生贡献。正式协议、登录、审批及其他模型引导不在屏蔽范围。

## 证据

- [实际内置浏览器验收](RC153-notice-IAB.json)：旧版刷新复现；修复后同页刷新和新页均无通知；隔离冷启动及设置→模型通过。
- [完整 CI](RC153-check-ci-r2.exit.json)：507 单测、108 Chromium 测试，自然退出 0，源文件未漂移。首次 CI 的测试夹具类型错误保留在 RC153-check-ci.log；修正的是夹具原生插槽 owner 类型。
- [不可变包](RC153-package-stage.json)：182 个白名单文件，两份 stage 摘要一致。
- [部署回读](RC153-notice-deployment.json)：仅更换持久 overlay 发布路径，Host bundle 不变；生产 Host PID8584、桥接 PID9188 未重启。回滚文件 `cordis.patch.rc153-prepublish.bak` 保留。

## 不混淆的边界

新页无内测通知，但它曾显示目录同步超时；两次 Node 公网 TLS 探针报 `TypeError: fetch failed` / `read ECONNRESET`。这些不能记成网络通过，也不改变本轮通知已关闭的事实。未继续原因：用户本轮明确只要求关闭启动通知，先前网络查因留在 RC152 证据，不借本轮通知设置扩展为网络修复；下一步：恢复连接修复范围时关联同一时段的目录与 TLS 失败。

内置浏览器两次控制超时后，均按 fix-inweb 读回原标签/已创建标签，未重复开页、未改全局配置。没有把等待变长当作浏览器根因修复。

收尾：本次临时标签 2/3 已关闭，原标签 1 保留；一次性隔离 Host PID9440 的启动参数与父进程核对后停止，3186 已释放。生产 3181/3185 仍由 PID8584/9188 监听。没有创建长期服务或变更既有定时监控。
