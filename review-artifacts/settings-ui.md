# Settings UI review

## 已改

- AI 成员表单只使用服务端提供的模型与推理档位；角色指令默认折叠，保存过程禁用重复提交。
- 保存仅在既有 API 返回 `true` 后显示“已保存”；返回 `false` 时保留草稿并显示失败反馈，不误报成功。
- 原生设置页明确区分房间 AI 成员与真人成员入口；真人成员仍只从对应群聊的“群管理”添加。
- 系统提示词默认折叠，保留原有超级管理员授权和所有现有错误提示。

## 已测

- `pnpm exec vitest run tests/ui.test.tsx tests/agent-profiles-panel.test.tsx tests/settings-layout.test.ts` — 3 files / 33 tests passed.
- `pnpm exec vitest run --config vitest.browser.config.ts tests/browser/settings-layout.test.ts` — 1 file / 1 test passed at 390px viewport.
- `git diff --check -- src/client/ChatroomAccountPanels.tsx src/client/ChatroomPanels.tsx tests/agent-profiles-panel.test.tsx tests/settings-layout.test.ts tests/browser/settings-layout.test.ts` — passed.

## 未测与阻塞

- 未运行 build、dist、package/lock 更新：本 lane 明确禁止。
- `pnpm exec tsc --noEmit` 被共享改动阻塞：`src/client/store.ts(972,58): error TS2454: Variable 'load' is used before being assigned.` 本 lane 未修改该文件。
