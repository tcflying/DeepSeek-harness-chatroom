# Chatroom responsive UI evidence

## Scope

This lane changes only the additive Chatroom stylesheet and adds a Chromium
layout regression fixture. Native DeepSeek Harness session, composer, model,
permission, trajectory, and sidebar DOM are not replaced.

## Covered geometry

- 320, 360, and 390px: horizontally reachable multi-agent header, full-width
  group-management drawer, direct-message composer, long URL/file-name
  containment, touch-sized header actions, and mobile sheet spacing.
- 768px and 1280px: header returns to its wrapped desktop/tablet behavior;
  drawers and direct panels remain within the viewport.
- Light and dark host variables: direct surface continues to inherit host
  `--bg-primary`, rather than imposing a light-only color.
- Settings lane contract: `.dsh-chatroom-settings-advanced` is a native
  `<details>` surface with an accessible focused summary and no default-open
  state.

## Test command

`pnpm exec vitest run --config vitest.browser.config.ts tests/browser/agent-header-layout.test.ts tests/browser/branch-layout.test.ts tests/browser/direct-layout.test.ts tests/browser/responsive-layout.test.ts`

The previously existing three-file run completed with 13 tests passed before
the responsive additions. The new responsive command was submitted to the
shared local Chromium pool; its process did not return during this lane's
bounded wait, so final Chromium execution remains a parent-level gate.

## Not a claim

No real mobile OS, touch hardware, Safari/WebKit, Firefox, installed Harness
window, live server, database, or online account was opened or changed.
