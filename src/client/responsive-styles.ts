/** Plugin-owned responsive layer. No device sniffing, host patch or viewport listeners. */
export const CHATROOM_RESPONSIVE_STYLES = `
/* An unfolded device can still give Settings a narrow pane. Size to that pane. */
.dsh-chatroom-settings {
  container: chatroom-settings / inline-size;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 26rem), 1fr));
  align-items: start;
  gap: 20px;
  max-width: none;
  overflow-x: visible;
  padding-bottom: max(20px, env(safe-area-inset-bottom, 0px));
}
.dsh-chatroom-settings > .dsh-chatroom-settings-header,
.dsh-chatroom-settings > .dsh-chatroom-admin-card,
.dsh-chatroom-settings > .dsh-chatroom-error { grid-column: 1 / -1; }
.dsh-chatroom-settings > .dsh-chatroom-card { container: chatroom-card / inline-size; }
.dsh-chatroom-settings > .dsh-chatroom-card > header { padding-bottom: 10px; border-bottom: 1px solid var(--dsw-alias-border-l2, #dce0e6); }
.dsh-chatroom-settings > .dsh-chatroom-card > header h2 { margin: 0; font-size: 15px; line-height: 22px; font-weight: 600; }
.dsh-chatroom-settings > .dsh-chatroom-card > header p { margin: 4px 0 0; font-size: 12px; line-height: 18px; }
.dsh-chatroom-settings .dsh-chatroom-panel-status { padding: 8px 0; margin: 4px 0; text-align: left; font-size: 13px; line-height: 1.55; }
.dsh-chatroom-settings .dsh-chatroom-account-card > button { border: 1px solid var(--dsw-alias-border-l2, #dce0e6); border-radius: 8px; background: transparent; color: inherit; padding: 8px 12px; font: inherit; cursor: pointer; }
.dsh-chatroom-settings .dsh-chatroom-account-card > small { display: block; margin-top: 6px; color: var(--dsw-alias-label-secondary, #505666); font-size: 12px; }
.dsh-chatroom-settings :is(p, strong, small, label, code) { overflow-wrap: anywhere; }
.dsh-chatroom-settings :is(input, select, textarea) { min-width: 0; max-width: 100%; box-sizing: border-box; }
.dsh-chatroom-settings .dsh-chatroom-group-setup-fields { grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr)); }
.dsh-chatroom-settings .dsh-chatroom-group-setup-list { grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr)); }
.dsh-chatroom-settings .dsh-chatroom-wecom-account-row { flex-wrap: wrap; }
.dsh-chatroom-settings .dsh-chatroom-user-actions { flex-wrap: wrap; }
.dsh-chatroom-settings .dsh-chatroom-agents-form { grid-template-columns: repeat(auto-fit, minmax(min(100%, 13rem), 1fr)); }
.dsh-chatroom-agents-form > .dsh-chatroom-settings-advanced { grid-column: 1 / -1; }
.dsh-chatroom-agents-form label { min-width: 0; }
.dsh-chatroom-agents-form label:has(input[type="checkbox"]) { display: flex; align-items: center; gap: 8px; width: auto; min-height: 38px; white-space: nowrap; overflow-wrap: normal; }
.dsh-chatroom-agents-form textarea { width: 100%; min-height: 100px; box-sizing: border-box; resize: vertical; }
.dsh-chatroom-settings .dsh-chatroom-agents-room-picker { display: flex; gap: 6px; min-width: 0; }
.dsh-chatroom-settings .dsh-chatroom-agents-room-picker select { flex: 1; min-width: 0; }
.dsh-chatroom-settings .dsh-chatroom-agent-profile-actions { display: flex; flex-wrap: wrap; gap: 4px; }
.dsh-chatroom-settings :is(button, summary):focus-visible { outline: 2px solid var(--brand-primary, #4f7cff); outline-offset: 2px; }

@container chatroom-settings (max-width: 32rem) {
  .dsh-chatroom-settings .dsh-chatroom-admin-form,
  .dsh-chatroom-settings .dsh-chatroom-provider-form { grid-template-columns: minmax(0, 1fr); padding: 12px; }
  .dsh-chatroom-settings .dsh-chatroom-user-table > div { grid-template-columns: 34px minmax(0, 1fr); }
  .dsh-chatroom-settings .dsh-chatroom-user-actions { grid-column: 2; }
  .dsh-chatroom-settings .dsh-chatroom-provider-list > div { grid-template-columns: minmax(0, 1fr); }
  .dsh-chatroom-settings .dsh-chatroom-automation-form { grid-template-columns: minmax(0, 1fr); }
}
@container chatroom-card (max-width: 30rem) {
  .dsh-chatroom-settings .dsh-chatroom-admin-form,
  .dsh-chatroom-settings .dsh-chatroom-provider-form { grid-template-columns: minmax(0, 1fr); }
  .dsh-chatroom-settings .dsh-chatroom-member { grid-template-columns: 38px minmax(0, 1fr); }
  .dsh-chatroom-settings .dsh-chatroom-agent-profile-actions { grid-column: 2; }
}

/* Only the native dialog currently displaying THIS plugin is adapted. No hashed
   host classes or changes to other Settings sections, permissions or actions. */
[role="dialog"]:has(.dsh-chatroom-settings) {
  width: min(1120px, calc(100vw - 32px));
  max-width: calc(100vw - 32px);
  max-height: calc(100dvh - 32px);
}
[role="dialog"]:has(.dsh-chatroom-settings) > :has(.dsh-chatroom-settings) { min-width: 0; min-height: 0; }
[role="dialog"] :has(> [data-slot="settings.section"] .dsh-chatroom-settings) { min-width: 0; min-height: 0; }

/* Grid already reserves the composer row: the old 90/120px extra message padding
   wasted a large part of a landscape / folded viewport. */
.dsh-chatroom-direct-panel { min-height: 0; max-block-size: 100dvh; container: chatroom-direct / inline-size; }
.dsh-chatroom-direct-messages { padding-bottom: 16px; overscroll-behavior-y: contain; }
.dsh-chatroom-direct-composer { margin-bottom: max(8px, env(safe-area-inset-bottom, 0px)); }
.dsh-chatroom-direct-composer textarea { min-width: 0; box-sizing: border-box; }
.dsh-chatroom-thread-messages { min-height: 0; overscroll-behavior-y: contain; }
.dsh-chatroom-thread-panel { grid-template-rows: auto minmax(0, 1fr) auto; max-block-size: 100dvh; }
.dsh-chatroom-member-card { box-sizing: border-box; max-block-size: 100dvh; padding-bottom: max(20px, env(safe-area-inset-bottom, 0px)); overscroll-behavior-y: contain; }
.dsh-chatroom-thread-composer { padding-bottom: max(12px, env(safe-area-inset-bottom, 0px)); }
.dsh-chatroom-dialog-layer { box-sizing: border-box; max-block-size: 100dvh; overflow-y: auto; }
.dsh-chatroom-dialog-layer > .dsh-chatroom-card { max-width: 100%; }
.dsh-chatroom-search-dialog { max-height: calc(100dvh - 48px); }
.dsh-chatroom-search-layer { box-sizing: border-box; padding-top: min(6dvh, 48px); }
.dsh-chatroom-emoji-picker, .dsh-chatroom-direct-emoji-picker { max-height: min(280px, 42dvh); overflow-y: auto; }
.dsh-chatroom-control-label { white-space: nowrap; }

@container chatroom-direct (max-width: 40rem) {
  .dsh-chatroom-direct-messages { padding-inline: 12px; }
  .dsh-chatroom-direct-messages > .dsh-chatroom-direct-message { max-width: 96%; }
  .dsh-chatroom-direct-composer { width: calc(100% - 16px); padding-inline: 12px; }
  .dsh-chatroom-direct-composer-tools { flex-wrap: wrap; }
  .dsh-chatroom-direct-composer-tools > small { display: none; }
}
@media (max-width: 640px) {
  [role="dialog"]:has(.dsh-chatroom-settings) {
    flex-direction: column;
    width: calc(100vw - 16px);
    max-width: calc(100vw - 16px);
    height: calc(100dvh - 16px);
    max-height: calc(100dvh - 16px);
    margin: 8px;
  }
  [role="dialog"]:has(.dsh-chatroom-settings) > nav {
    flex: 0 0 auto; width: 100%; min-height: 0; max-height: 104px; padding: 6px 8px;
  }
  [role="dialog"]:has(.dsh-chatroom-settings) > nav > :has(> button) {
    display: flex; flex-direction: row; gap: 4px; min-width: 0; overflow-x: auto;
  }
  [role="dialog"]:has(.dsh-chatroom-settings) > nav button { flex: 0 0 auto; width: auto; white-space: nowrap; padding-inline: 10px; }
  [role="dialog"]:has(.dsh-chatroom-settings) > :has(.dsh-chatroom-settings) { flex: 1; overflow: hidden; }
  [role="dialog"] :has(> [data-slot="settings.section"] .dsh-chatroom-settings) { padding: 0 12px 12px; overflow-y: auto; }
  .dsh-chatroom-settings { gap: 16px; }
  .dsh-chatroom-settings .dsh-chatroom-settings-header { flex-direction: row; }
  .dsh-chatroom-composer-actions .dsh-chatroom-file-button > span:not([aria-hidden]),
  .dsh-chatroom-session-controls .dsh-chatroom-control-label { display: none; }
  .dsh-chatroom-session-controls { gap: 2px; flex-wrap: wrap; }
  .dsh-chatroom-session-controls button { min-width: 40px; padding-inline: 5px; }
  .dsh-chatroom-direct-panel > header { min-height: 52px; }
  .dsh-chatroom-direct-messages { gap: 18px; padding-top: 12px; }
}
@media (pointer: coarse), (max-width: 640px) {
  .dsh-chatroom-settings :is(button, summary),
  .dsh-chatroom-member-card button,
  .dsh-chatroom-session-controls button,
  .dsh-chatroom-composer-actions > button,
  .dsh-chatroom-direct-composer-tools button { min-height: 44px; min-width: 44px; touch-action: manipulation; }
  .dsh-chatroom-settings :is(input:not([type="checkbox"]), select, textarea),
  .dsh-chatroom-direct-composer textarea,
  .dsh-chatroom-thread-composer textarea { font-size: 16px; }
  .dsh-chatroom-settings :is(input:not([type="checkbox"]), select) { min-height: 44px; }
}
@media (max-height: 500px) {
  .dsh-chatroom-direct-panel > header { min-height: 44px; }
  .dsh-chatroom-direct-messages { padding-top: 8px; padding-bottom: 8px; }
  .dsh-chatroom-direct-composer { min-height: 88px; gap: 4px; padding-block: 6px; }
  .dsh-chatroom-direct-composer textarea { min-height: 36px; max-height: 22dvh; }
  .dsh-chatroom-search-layer { padding-block: 8px; }
  .dsh-chatroom-search-dialog { max-height: calc(100dvh - 16px); }
}
`
