import { CLASSIC_AVATAR_IMAGES } from './classic-avatar-data.js'

/** Out-of-tree skin for the pinned Harness semantic slots; no hashed host classes. */
export const QQ2007_STYLES = `
.dsh-chatroom-style-switch { display:inline-flex; align-items:center; gap:5px; flex-shrink:0; white-space:nowrap; color:var(--dsw-alias-label-secondary,#61666b); font-size:12px; }
.dsh-chatroom-style-switch select { min-height:30px; max-width:100px; border:1px solid var(--dsw-alias-border-l2,#ccd1d9); border-radius:5px; background:var(--dsw-alias-bg-layer-1,#fff); color:var(--dsw-alias-label-primary,#111); padding:3px 6px; font:inherit; cursor:pointer; }
.dsh-chatroom-style-switch select:focus-visible { outline:2px solid #2868be; outline-offset:2px; }
.dsh-chatroom-style-fallback { position:fixed; top:max(12px,env(safe-area-inset-top)); right:max(16px,env(safe-area-inset-right)); z-index:15; padding:4px 8px; border-radius:5px; background:var(--dsw-alias-bg-layer-1,#fff); }
html:has([data-slot="conversation.session.header.utilities"]) .dsh-chatroom-style-fallback { display:none; }
/* Let long room names and plugin controls wrap without covering native Session log. */
html[data-dsh-chatroom-installed] [data-slot="conversation.session.header"] > header > div:first-child { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:6px 12px; height:auto; }
html[data-dsh-chatroom-installed] [data-slot="conversation.session.header"] > header > div:first-child > div:first-child { display:contents; }
html[data-dsh-chatroom-installed] [data-slot="conversation.session.header"] nav { grid-column:1; grid-row:1; min-width:0; }
html[data-dsh-chatroom-installed] [data-slot="conversation.session.header"] div:has(> [data-slot="conversation.session.header.actions"]) { grid-column:1 / -1; grid-row:2; min-width:0; max-width:100%; display:flex; align-items:center; flex-wrap:wrap; gap:6px; }
html[data-dsh-chatroom-installed] [data-slot="conversation.session.header"] > header > div:first-child > div:last-child { grid-column:2; grid-row:1; position:static; display:flex; align-self:center; margin-left:auto; gap:10px; }
html[data-dsh-chatroom-installed] .dsh-chatroom-header-actions { min-width:0; max-width:100%; flex:1 1 auto; flex-wrap:wrap; gap:6px; }
html[data-dsh-chatroom-installed] .dsh-chatroom-agent-roster { display:block; position:relative; min-width:0; max-width:100%; flex:0 0 auto; overflow:visible; font-size:13px; }
html[data-dsh-chatroom-installed] .dsh-chatroom-agent-roster > summary { cursor:pointer; min-height:30px; padding:4px 8px; box-sizing:border-box; border:1px solid var(--dsw-alias-border-l2,#91b3d4); border-radius:3px; background:var(--dsw-alias-bg-layer-1,#fff); }
html[data-dsh-chatroom-installed] .dsh-chatroom-agent-roster-menu { position:absolute; top:calc(100% + 5px); left:0; z-index:140; display:flex; flex-direction:column; gap:8px; width:240px; max-width:calc(100vw - 80px); max-height:45dvh; overflow:auto; padding:12px; border:1px solid var(--dsw-alias-border-l2,#91b3d4); border-radius:4px; background:var(--dsw-specific-menu,#fff); box-shadow:0 4px 16px #173a6133; }
html[data-dsh-chatroom-installed] .dsh-chatroom-agent-roster-menu small { display:block; white-space:normal; font-size:12px; line-height:1.5; }
html[data-dsh-chatroom-installed] .dsh-chatroom-agent-roster:not([open]) > .dsh-chatroom-agent-roster-menu { display:none; }
html[data-dsh-chatroom-installed] .dsh-chatroom-header-actions > button { min-height:30px; }
.dsh-chatroom-sidebar-backdrop { display:none; }
html[data-dsh-chatroom-style="qq2007"] { color-scheme:light !important; }
html[data-dsh-chatroom-style="qq2007"] body {
  --bg-primary:#fff; --bg-secondary:#edf6ff; --text-primary:#173a61; --text-secondary:#45637d; --text-tertiary:#58738c; --border-primary:#91b3d4; --brand-primary:#176cb7;
  --dsw-alias-bg-base:#e5f2ff; --dsw-alias-bg-layer-1:#fff; --dsw-alias-bg-layer-2:#edf6ff; --dsw-alias-bg-layer-3:#fff;
  --dsw-alias-bg-module-platform:#e4f1fc; --dsw-alias-bg-overlay:#d4e8fa; --dsw-alias-bg-multi-select:#d7eaff;
  --dsw-alias-label-primary:#173a61; --dsw-alias-label-primary-dimmed:#24496c; --dsw-alias-label-primary-bluish:#064d9a;
  --dsw-alias-label-secondary:#45637d; --dsw-alias-label-tertiary:#58738c; --dsw-alias-label-caption:#58738c;
  --dsw-alias-label-primary-foreground:#fff; --dsw-alias-label-primary-inverted:#fff;
  --dsw-alias-brand-primary:#176cb7; --dsw-alias-brand-text:#11538e; --dsw-alias-state-business-primary:#176cb7;
  --dsw-alias-state-business-tertiary:#d5eaff; --dsw-alias-button-primary-fill:#247cc6; --dsw-alias-button-primary-hover:#165c9b;
  --dsw-alias-button-info-fill:#247cc6; --dsw-alias-button-info-hover:#165c9b; --dsw-alias-button-elevated-fill:#f4faff;
  --dsw-alias-button-floating-fill:#f4faff; --dsw-alias-button-floating-hover:#d9edff; --dsw-alias-button-ghost-active-fill:#cee5fc;
  --dsw-alias-border-l1:#c8ddef; --dsw-alias-border-l2:#91b3d4; --dsw-alias-border-l2-darkmode-thin:#91b3d4;
  --dsw-alias-border-l3:#799dbe; --dsw-alias-border-l4:#6289af;
  --dsw-alias-interactive-bg-hover:#dcefff; --dsw-alias-interactive-bg-hover-solid:#dcefff; --dsw-alias-interactive-bg-active:#bfdcfa;
  --dsw-specific-sidebar-fill:#e9f4ff; --dsw-specific-sidebar-nav-item-active:#c5e2fc; --dsw-specific-sidebar-nav-item-active-accent:#bfdcfa;
  --dsw-specific-sidebar-nav-item-hover:#d8edff; --dsw-specific-selector:#deedfa; --dsw-specific-bubble:#f1f9ff; --dsw-specific-bubble-highlight:#d1eaff;
  --dsw-specific-menu:#f4faff; --dsw-specific-input-major:#fff; --dsw-specific-tip:#edf6ff;
  --dsw-alias-markdown-code-block:#edf6ff; --dsw-alias-markdown-code-block-banner:#dceefe; --dsw-alias-markdown-inline-code:#dfedfa;
  --dsw-alias-scrollbar-bg-l1:#9cbfde; --dsw-alias-scrollbar-bg-l2:#9cbfde; --dsw-alias-scrollbar-hover-l1:#6494bf; --dsw-alias-scrollbar-hover-l2:#6494bf;
  background:#e5f2ff; color:#173a61; font-family:Tahoma,"Microsoft YaHei","PingFang SC",sans-serif; font-size:14px;
}
html[data-dsh-chatroom-style="qq2007"] :is(button,input,textarea,select,[contenteditable="true"]) { font-family:Tahoma,"Microsoft YaHei","PingFang SC",sans-serif; }
html[data-dsh-chatroom-style="qq2007"] [data-slot="sidebar.brand.mark"] { display:inline-flex !important; width:30px; height:32px; pointer-events:none; }
html[data-dsh-chatroom-style="qq2007"] :is([data-slot="sidebar.brand.mark"],[data-slot="sidebar.brand.name"]) > * { display:none !important; }
html[data-dsh-chatroom-style="qq2007"] [data-slot="sidebar.brand.mark"]::before { content:""; display:block; width:30px; height:32px; background:url("${CLASSIC_AVATAR_IMAGES[0]}") center / contain no-repeat; }
html[data-dsh-chatroom-style="qq2007"] [data-slot="sidebar.brand.name"] { display:inline-flex !important; align-items:baseline; gap:8px; color:#123f72; }
html[data-dsh-chatroom-style="qq2007"] [data-slot="sidebar.brand.name"]::before { content:"QQ"; font:bold 24px/1 Tahoma,sans-serif; letter-spacing:-1px; }
html[data-dsh-chatroom-style="qq2007"] [data-slot="sidebar.brand.name"]::after { content:"2007 · 群聊"; font:13px/1.4 Tahoma,"Microsoft YaHei",sans-serif; }
html[data-dsh-chatroom-style="qq2007"] :is(.dsh-chatroom-human-bubble,.dsh-chatroom-native-message,.dsh-chatroom-thread-message-body,.dsh-chatroom-direct-bubble) { font-size:max(16px,var(--dsh-content-font-size,14px)); line-height:1.65; overflow-wrap:anywhere; }
html[data-dsh-chatroom-style="qq2007"] .dsh-chatroom-native-message [data-time-hover-root] { font-size:inherit; line-height:inherit; }
html[data-dsh-chatroom-style="qq2007"] [contenteditable="true"] { font-size:max(16px,var(--dsh-content-font-size,14px)); line-height:1.6; }
html[data-dsh-chatroom-style="qq2007"] .dsh-chatroom-message-column { max-width:min(calc(100% - 52px),72ch); }
html[data-dsh-chatroom-style="qq2007"] :is(.dsh-chatroom-speaker,.dsh-chatroom-message-actions,time) { color:#45637d; font-size:12px; }
html[data-dsh-chatroom-style="qq2007"] :is(.dsh-chatroom-member-card,.dsh-chatroom-card) { background:#f4f9ff; border-color:#91b3d4; }
html[data-dsh-chatroom-style="qq2007"] [data-slot="root"] > div:has(> div > [data-slot="sidebar"]) { box-shadow:inset 0 0 0 1px #779ec8; background:#edf6ff; }
html[data-dsh-chatroom-style="qq2007"] [data-slot="conversation.session.header"] > header { background:linear-gradient(180deg,#f8fcff 0%,#c2e4ff 45%,#83b9ea 46%,#d9edff 100%); border-bottom:1px solid #6f9cc8; box-shadow:inset 0 1px #fff; padding-top:10px; }
html[data-dsh-chatroom-style="qq2007"] [data-slot="conversation.session.header"] nav { color:#0d427a; font-weight:bold; text-shadow:0 1px #fff; }
html[data-dsh-chatroom-style="qq2007"] [data-slot="conversation.session.header"] [role="tablist"] { gap:3px; padding-top:8px; }
html[data-dsh-chatroom-style="qq2007"] [data-slot="conversation.session.header"] [role="tab"] { min-width:60px; border:1px solid #6b9ac5; border-bottom:0; border-radius:5px 5px 0 0; background:linear-gradient(#f9fcff,#c9e5ff); box-shadow:inset 0 1px #fff; color:#24496c; padding:5px 14px; }
html[data-dsh-chatroom-style="qq2007"] [data-slot="conversation.session.header"] [role="tab"][aria-selected="true"] { background:#fff; color:#0755a0; font-weight:bold; border-top:3px solid #f5b94e; }
html[data-dsh-chatroom-style="qq2007"] :is(button,select):not([role="treeitem"]):not([role="tab"]):not([aria-label="新建会话"]) { border-radius:3px; }
html[data-dsh-chatroom-style="qq2007"] :is(.dsh-chatroom-manage-action,.dsh-chatroom-style-switch select,[data-slot="conversation.session.header.utilities"] button,.dsh-chatroom-settings button,.dsh-chatroom-card button,.dsh-chatroom-direct-composer-tools button) { border:1px solid #7a9fc3; background:linear-gradient(#fff 0%,#edf6ff 48%,#d8eafa 49%,#c5dff4 100%); box-shadow:inset 1px 1px #fff,inset -1px -1px #b5cee5; color:#173a61; }
html[data-dsh-chatroom-style="qq2007"] :is(.dsh-chatroom-manage-action, .dsh-chatroom-settings button, .dsh-chatroom-card button):hover:not(:disabled) { border-color:#c58a28; background:linear-gradient(#fffbe8,#ffe5a4); }
html[data-dsh-chatroom-style="qq2007"] button:focus-visible { outline:2px solid #155eab; outline-offset:2px; }
html[data-dsh-chatroom-style="qq2007"] button:disabled { opacity:.55; }
html[data-dsh-chatroom-style="qq2007"] [data-dsh-chatroom-category-header] { box-sizing:border-box; width:auto !important; margin:5px 4px 2px; border:1px solid #a5c3df; border-radius:2px; background:linear-gradient(#fff,#cfe5fa); box-shadow:inset 0 1px #fff; }
html[data-dsh-chatroom-style="qq2007"] [data-dsh-chatroom-category-header] strong { color:#124a7d; }
/* The native category list reserves an inline scrollbar gutter.  Its children
   must size to the post-gutter content box, rather than force an 8px x-scroll. */
html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] [data-dsh-chatroom-workspace-categories] { box-sizing:border-box; inline-size:100%; min-inline-size:0; max-inline-size:100%; scrollbar-gutter:stable; }
html[data-dsh-chatroom-style="qq2007"] [role="treeitem"], html[data-dsh-chatroom-style="qq2007"] [data-dsh-chatroom-direct-row] > button { border-radius:2px; }
html[data-dsh-chatroom-style="qq2007"] [role="treeitem"][aria-selected="true"] { background:linear-gradient(#e5f4ff,#b9dbf7); outline:1px solid #8ab5dc; outline-offset:-1px; }
html[data-dsh-chatroom-style="qq2007"] :is(.dsh-chatroom-avatar,.dsh-chatroom-message-avatar,[data-dsh-chatroom-group-avatar],[data-dsh-chatroom-mention-avatar]) { border:1px solid #8caecb; border-radius:2px; box-shadow:0 0 0 2px #fff,0 0 0 3px #bad0e4; }
html[data-dsh-chatroom-style="qq2007"] .dsh-chatroom-participant-name { color:#0759a9; font-weight:bold; }
html[data-dsh-chatroom-style="qq2007"] .dsh-chatroom-participant-message[data-own="true"] .dsh-chatroom-participant-name { color:#187540; }
html[data-dsh-chatroom-style="qq2007"] :is(.dsh-chatroom-bubble,.dsh-chatroom-direct-bubble) { border:1px solid #b5cde3; border-radius:3px; background:#f5fbff; box-shadow:inset 1px 1px #fff; }
html[data-dsh-chatroom-style="qq2007"] .dsh-chatroom-native-message > div:first-child > div:first-child > :not([data-slot]) { border:1px solid #b5cde3; border-radius:3px; background:#f5fbff; box-shadow:inset 1px 1px #fff; }
html[data-dsh-chatroom-style="qq2007"] .dsh-chatroom-message-actions { color:#557388; }
html[data-dsh-chatroom-style="qq2007"] .dsh-chatroom-message-actions button { background:transparent; box-shadow:none; }
html[data-dsh-chatroom-style="qq2007"] :is([role="dialog"],.dsh-chatroom-card,.dsh-chatroom-members-panel,.dsh-chatroom-agent-panel,.dsh-chatroom-search-dialog,.dsh-chatroom-direct-panel,.dsh-chatroom-thread-panel) { border:1px solid #7199c4; border-radius:5px; background:#f4f9ff; box-shadow:inset 0 0 0 2px #d7eaff,3px 4px 12px #194c7c38; }
html[data-dsh-chatroom-style="qq2007"] :is(.dsh-chatroom-members-panel,.dsh-chatroom-agent-panel,.dsh-chatroom-search-dialog,.dsh-chatroom-direct-panel,.dsh-chatroom-thread-panel) > header { background:linear-gradient(#e8f6ff,#8fbfed); border-bottom:1px solid #7099bf; color:#113f6d; }
html[data-dsh-chatroom-style="qq2007"] :is([role="menu"],[role="listbox"],.dsh-chatroom-emoji-picker,.dsh-chatroom-direct-emoji-picker) { border:1px solid #7199c4; border-radius:2px; background:#f4faff; box-shadow:2px 3px 5px #194c7c35; }
html[data-dsh-chatroom-style="qq2007"] :is(input:not([type="checkbox"]):not([type="radio"]),textarea) { border:1px solid #8baac7; border-radius:2px; background:#fff; color:#173a61; box-shadow:inset 1px 1px 2px #7d9cb322; }
html[data-dsh-chatroom-style="qq2007"] [contenteditable="true"] { color:#173a61; }
html[data-dsh-chatroom-style="qq2007"] [data-slot="conversation.input"] { background:linear-gradient(#e3f2ff,#f8fcff); }
html[data-dsh-chatroom-style="qq2007"] .dsh-chatroom-direct-composer { border-radius:3px; border:1px solid #8baac7; background:#fff; }
html[data-dsh-chatroom-style="qq2007"] a { color:#0759a9; }
html[data-dsh-chatroom-style="qq2007"] ::selection { background:#add6fb; color:#102d4c; }
html[data-dsh-chatroom-installed] :is(.dsh-chatroom-emoji-picker,.dsh-chatroom-direct-emoji-picker) { max-height:min(280px,42dvh); overflow-y:auto; }
@media (max-width:640px) {
  .dsh-chatroom-style-switch select { min-height:36px; }
  .dsh-chatroom-style-switch > span[aria-hidden] { display:none; }
}
/* Mobile / folded layouts: keep the conversation full-width, overlay navigation. */
@media (max-width:900px) {
  /* The Host's semantic bottom-panel toggle is an absolute 60px cluster at
     the header edge. Reserve its native hit area instead of layering over it. */
  html[data-dsh-chatroom-installed]:has(button[aria-label="展开底部面板"],button[aria-label="折叠底部面板"])
    [data-slot="conversation.session.header"] > header > div:first-child > div:last-child { margin-right:64px; }
  html[data-dsh-chatroom-installed]:not([data-dsh-chatroom-branch-frame]) [data-slot="root"] > div:has(> div > [data-slot="sidebar"]) { grid-template-columns:56px minmax(0,1fr) 0 !important; }
  /* Match the installed mobile shim's drawer layer: its1050 scrim must stay
     below native navigation and nested Settings, including while Files is open. */
  html[data-dsh-chatroom-installed]:not([data-dsh-chatroom-branch-frame]) [data-slot="root"] > div > div:has(> [data-slot="sidebar"]) { position:fixed; inset:0 auto 0 0; z-index:1100; width:56px; overflow:visible; }
  html[data-dsh-chatroom-installed]:not([data-dsh-chatroom-branch-frame]) [data-slot="root"] > div > div:has(> [data-slot="conversation"]) { grid-column:2; grid-row:1; min-width:0; }
  html[data-dsh-chatroom-installed]:not([data-dsh-chatroom-branch-frame]) [data-slot="root"] > div > div:has(> [data-slot="details"]) { grid-column:3; grid-row:1; min-width:0; }
  html[data-dsh-chatroom-installed] [data-slot="sidebar"] > div { max-width:calc(100vw - 56px); height:100dvh; }
  html[data-dsh-chatroom-installed] [data-slot="root"] > div:not([data-sidebar-collapsed="true"]) > div > [data-slot="sidebar"] > div { width:min(280px,calc(100vw - 56px)) !important; box-shadow:4px 0 20px #173a6133; }
  html[data-dsh-chatroom-installed] [data-shell-overlay] { z-index:auto; }
  html[data-dsh-chatroom-installed]:has([data-slot="root"] > div:not([data-sidebar-collapsed="true"]) > div > [data-slot="sidebar"]) .dsh-chatroom-sidebar-backdrop { display:block; position:fixed; inset:0 0 0 min(280px,calc(100vw - 56px)); z-index:1090; border:0; background:#173a6140; cursor:pointer; pointer-events:auto; }
  html[data-dsh-chatroom-installed]:not([data-dsh-chatroom-branch-frame]) [data-slot="root"] > div:not([data-details-collapsed="true"]) > div:has(> [data-slot="details"]) { position:fixed; inset:0 0 0 56px; z-index:15; width:auto; background:var(--dsw-alias-bg-layer-1,#fff); }
  html[data-dsh-chatroom-installed] [data-slot="root"] > div > [data-side="sidebar"] { display:none; }
  html[data-dsh-chatroom-installed] [data-slot="conversation.session.header"] > header { padding:8px 10px 0; }
  html[data-dsh-chatroom-installed] [data-slot="conversation.session.header"] > header > div:first-child { column-gap:6px; }
  html[data-dsh-chatroom-installed] [data-slot="conversation.session.header"] div:has(> [data-slot="conversation.session.header.actions"]) { gap:4px; }
  html[data-dsh-chatroom-installed] .dsh-chatroom-header-actions { gap:4px; width:auto; }
  html[data-dsh-chatroom-installed] .dsh-chatroom-agent-roster { max-width:100%; }
  html[data-dsh-chatroom-installed] [data-slot="conversation.session.header.utilities"] button { min-width:32px; width:32px; height:34px; padding:6px; overflow:hidden; }
  html[data-dsh-chatroom-installed] [data-slot="conversation.session.header.utilities"] button > span { display:none; }
  html[data-dsh-chatroom-installed] .dsh-chatroom-style-switch { gap:4px; }
  html[data-dsh-chatroom-style="qq2007"] [role="dialog"] { max-width:calc(100vw - 16px); max-height:calc(100dvh - 16px); }
  html[data-dsh-chatroom-installed] :is(.dsh-chatroom-emoji-picker,.dsh-chatroom-direct-emoji-picker)[role="dialog"] { position:fixed; left:64px; right:8px; bottom:min(160px,35dvh); box-sizing:border-box; width:auto; max-width:calc(100vw - 72px); max-height:min(280px,42dvh); grid-template-columns:repeat(auto-fit,minmax(36px,1fr)); overflow-y:auto; }
}
@media (max-width:540px) {
  html[data-dsh-chatroom-installed]:has(button[aria-label="展开底部面板"],button[aria-label="折叠底部面板"])
    [data-slot="conversation.session.header"] > header > div:first-child > div:last-child { margin-right:0; }
  /* On phones the host keeps a separate right-edge sidebar toggle. Leave its
     hit area clear even when the bottom panel's larger control is absent. */
  html[data-dsh-chatroom-installed]:has(button[aria-label="展开侧边栏"],button[aria-label="折叠侧边栏"])
    [data-slot="conversation.session.header"] > header > div:first-child > div:last-child { margin-right:40px; }
  html[data-dsh-chatroom-installed] [data-slot="conversation.session.header"] div:has(> [data-slot="conversation.session.header.actions"]) > [data-slot] > :not(.dsh-chatroom-header-actions) { display:none; }
  html[data-dsh-chatroom-installed] .dsh-chatroom-identity-action { max-width:100%; min-height:28px; font-size:12px; }
  html[data-dsh-chatroom-installed] .dsh-chatroom-header-actions > button { min-height:34px; }
  html[data-dsh-chatroom-installed] .dsh-chatroom-agent-roster > summary { min-height:34px; }
  html[data-dsh-chatroom-installed] .dsh-chatroom-identity-action { flex-basis:100%; }
  html[data-dsh-chatroom-installed] .dsh-chatroom-header-actions { overflow:visible; }
  html[data-dsh-chatroom-installed] [data-slot="conversation.session.header"] [role="tablist"] { padding-top:4px; }
  html[data-dsh-chatroom-installed] [data-slot="conversation.session.header"] [role="tab"] { padding-block:4px; }
  /* Host participant rows already reserve avatar space. Do not subtract it a
     second time from the human-message column on a 56px mobile rail. */
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] .dsh-chatroom-participant-message .dsh-chatroom-message-column { max-width:100%; }
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] .dsh-chatroom-participant-message .dsh-chatroom-native-message > :first-child,
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] .dsh-chatroom-participant-message .dsh-chatroom-native-message > :first-child > :first-child { width:100% !important; max-width:100% !important; }
  html[data-dsh-chatroom-installed] div:has(> [data-slot="conversation.input.left"]) { min-width:0; max-width:100%; flex-wrap:wrap; }
  /* The host trailing row has five semantic occupants: right tools, model,
     context meter, interrupt, and send. Slots are display:contents, so a
     fixed four-column grid puts the model and send control on top of peers. */
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] div:has(> [data-slot="conversation.input.right"]):has(> [data-slot="conversation.input.model"]) { display:flex; flex-wrap:wrap; min-width:0; width:100%; align-items:center; gap:3px; margin-left:0; }
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] div:has(> [data-slot="conversation.input.right"]) > [data-slot="conversation.input.right"] > * { flex:0 0 auto; }
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] div:has(> [data-slot="conversation.input.right"]) > [data-slot="conversation.input.right"] > .dsh-chatroom-session-controls { flex:1 0 100%; width:100%; min-width:0; }
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] div:has(> [data-slot="conversation.input.right"]) > [data-slot="conversation.input.model"] > * { flex:1 0 80px; min-width:80px; max-width:100%; }
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] [data-slot="conversation.input.model"] button { min-width:0; width:100%; max-width:100%; overflow:hidden; padding-inline:4px; }
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] [data-slot="conversation.input.model"] button > span:first-child { display:block; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] div:has(> [data-slot="conversation.input.right"]) > :not([data-slot]) { flex:0 0 auto; }
  html[data-dsh-chatroom-installed] .dsh-chatroom-session-controls { flex-wrap:nowrap; }
  html[data-dsh-chatroom-installed] .dsh-chatroom-session-controls button { min-width:32px; padding-inline:4px; }
}
/* Keep the host settings navigation useful on phones in every section. */
@media (max-width:640px) {
  html[data-dsh-chatroom-installed] [role="dialog"]:has([data-slot="settings.section"]) { flex-direction:column; box-sizing:border-box; width:calc(100vw - 16px); height:calc(100dvh - 16px); max-height:calc(100dvh - 16px); margin:8px; }
  html[data-dsh-chatroom-installed] [role="dialog"]:has([data-slot="settings.section"]) > nav { box-sizing:border-box; flex:0 0 auto; width:100%; min-height:0; max-height:104px; padding:6px 8px; }
  html[data-dsh-chatroom-installed] [role="dialog"]:has([data-slot="settings.section"]) > nav > :has(> button) { display:flex; flex-direction:row; gap:4px; min-width:0; overflow-x:auto; }
  html[data-dsh-chatroom-installed] [role="dialog"]:has([data-slot="settings.section"]) > nav button { flex:0 0 auto; width:auto; min-height:40px; white-space:nowrap; padding-inline:10px; }
  html[data-dsh-chatroom-installed] [role="dialog"]:has([data-slot="settings.section"]) > nav + div { flex:1; min-width:0; min-height:0; overflow:hidden; }
  html[data-dsh-chatroom-installed] [role="dialog"] div:has(> [data-slot="settings.section"]) { min-height:0; padding:0 12px 12px; overflow-y:auto; }
  html[data-dsh-chatroom-installed] [data-slot="settings.general.item"] > div { flex-wrap:wrap; gap:10px; }
  html[data-dsh-chatroom-installed] .dsh-chatroom-member-card .dsh-chatroom-manage-title { grid-template-columns:minmax(0,1fr); }
  html[data-dsh-chatroom-installed] .dsh-chatroom-member-card .dsh-chatroom-manage-title > :not(.dsh-chatroom-switch) { min-width:0; max-width:100%; }
  html[data-dsh-chatroom-installed] .dsh-chatroom-member-card .dsh-chatroom-manage-title label:not(.dsh-chatroom-switch) { display:flex; flex-direction:column; gap:5px; }
  html[data-dsh-chatroom-installed] .dsh-chatroom-member-card :is(input:not([type="checkbox"]),select,textarea) { box-sizing:border-box; width:100%; min-width:0; max-width:100%; font-size:16px; }
  html[data-dsh-chatroom-installed] .dsh-chatroom-member-card .dsh-chatroom-settings-advanced { grid-column:1 / -1; }
}
@media (max-height:500px) and (max-width:900px) {
  html[data-dsh-chatroom-installed] [data-slot="conversation.session.header"] > header { max-height:35dvh; overflow-y:auto; }
}
/* A wide viewport can still leave a narrow conversation when the native Files
 * pane is expanded. Adapt to the actual center column, not just the viewport. */
html[data-dsh-chatroom-installed] [data-slot="root"] > div > div:has(> [data-slot="conversation"]) { container:chatroom-conversation / inline-size; }
@container chatroom-conversation (max-width:34rem) {
  html[data-dsh-chatroom-installed] [data-slot="conversation.session.header"] > header { padding:8px 10px 0; }
  html[data-dsh-chatroom-installed] [data-slot="conversation.session.header"] > header > div:first-child { column-gap:6px; }
  html[data-dsh-chatroom-installed] [data-slot="conversation.session.header"] div:has(> [data-slot="conversation.session.header.actions"]),
  html[data-dsh-chatroom-installed] .dsh-chatroom-header-actions { gap:4px; }
  html[data-dsh-chatroom-installed] [data-slot="conversation.session.header.utilities"] button { min-width:32px; width:32px; height:34px; padding:6px; overflow:hidden; }
  html[data-dsh-chatroom-installed] [data-slot="conversation.session.header.utilities"] button > span,
  html[data-dsh-chatroom-installed] .dsh-chatroom-style-switch > span { display:none; }
  html[data-dsh-chatroom-installed] div:has(> [data-slot="conversation.input.left"]) { min-width:0; max-width:100%; flex-wrap:wrap; }
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] div:has(> [data-slot="conversation.input.right"]):has(> [data-slot="conversation.input.model"]) { display:flex; flex-wrap:wrap; min-width:0; width:100%; align-items:center; gap:3px; margin-left:0; }
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] div:has(> [data-slot="conversation.input.right"]) > [data-slot="conversation.input.right"] > * { flex:0 0 auto; }
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] div:has(> [data-slot="conversation.input.right"]) > [data-slot="conversation.input.right"] > .dsh-chatroom-session-controls { flex:1 0 100%; width:100%; min-width:0; }
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] div:has(> [data-slot="conversation.input.right"]) > [data-slot="conversation.input.model"] > * { flex:1 0 80px; min-width:80px; max-width:100%; }
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] [data-slot="conversation.input.model"] button { min-width:0; width:100%; max-width:100%; overflow:hidden; padding-inline:4px; }
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] [data-slot="conversation.input.model"] button > span:first-child { display:block; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] div:has(> [data-slot="conversation.input.right"]) > :not([data-slot]) { flex:0 0 auto; }
  /* The host puts tools beside its timestamp/reaction siblings in one flex
     rail. A percentage width alone may still shrink to one glyph; put tools
     on a dedicated wrapping row inside that native rail. */
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] :is([data-dsh-chatroom-native-actions], [data-turn-tail] > :has(> [data-slot="conversation.chat.assistant-actions"] > .dsh-chatroom-assistant-tools)):has(.dsh-chatroom-assistant-tools) { flex-wrap:wrap !important; }
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] :is([data-dsh-chatroom-native-actions], [data-turn-tail] > :has(> [data-slot="conversation.chat.assistant-actions"] > .dsh-chatroom-assistant-tools)) .dsh-chatroom-assistant-tools { flex:1 0 100%; width:100%; }
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] .dsh-chatroom-assistant-actions { display:flex; width:100%; min-width:0; }
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] .dsh-chatroom-assistant-actions > :is(.dsh-chatroom-message-actions,.dsh-chatroom-reaction-bar) { min-width:0; }
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] .dsh-chatroom-assistant-actions .dsh-chatroom-message-actions > button { flex:0 0 auto; white-space:nowrap; }
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] .dsh-chatroom-assistant-actions .dsh-chatroom-action-label { display:none; }
  /* The Host already reserves avatar space before its participant column.
     Its userRow/userStack must use that available row in a narrow center pane. */
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] .dsh-chatroom-participant-message .dsh-chatroom-message-column { max-width:100%; }
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] .dsh-chatroom-participant-message .dsh-chatroom-native-message > :first-child,
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] .dsh-chatroom-participant-message .dsh-chatroom-native-message > :first-child > :first-child { width:100% !important; max-width:100% !important; }
}
/* On a very narrow conversation, put identity above the body. The 56px native
 * rail and transcript padding leave only 208px at a 320px viewport: reserving
 * another avatar column would still squeeze readable text to 162px. */
@container chatroom-conversation (max-width:24rem) {
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] .dsh-chatroom-participant-message:has(> .dsh-chatroom-avatar) {
    display:grid; grid-template-columns:36px minmax(0,1fr); gap:6px 10px;
  }
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] .dsh-chatroom-participant-message[data-dsh-chatroom-own="true"]:has(> .dsh-chatroom-avatar) { grid-template-columns:minmax(0,1fr) 36px; }
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] .dsh-chatroom-participant-message > .dsh-chatroom-avatar { grid-column:1; grid-row:1; box-sizing:border-box; width:34px; height:34px; margin-top:0; }
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] .dsh-chatroom-participant-message[data-dsh-chatroom-own="true"] > .dsh-chatroom-avatar { grid-column:2; justify-self:end; }
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] .dsh-chatroom-participant-message:has(> .dsh-chatroom-avatar) > .dsh-chatroom-message-column { display:contents; }
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] .dsh-chatroom-participant-message:has(> .dsh-chatroom-avatar) > .dsh-chatroom-message-column > * { grid-column:1 / -1; min-width:0; max-width:100%; justify-self:start; }
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] .dsh-chatroom-participant-message[data-dsh-chatroom-own="true"] > .dsh-chatroom-message-column > * { justify-self:end; }
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] .dsh-chatroom-participant-message:has(> .dsh-chatroom-avatar) > .dsh-chatroom-message-column > .dsh-chatroom-display-name { grid-column:2; grid-row:1; align-self:center; box-sizing:border-box; }
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] .dsh-chatroom-participant-message[data-dsh-chatroom-own="true"] > .dsh-chatroom-message-column > .dsh-chatroom-display-name { grid-column:1; }
  html[data-dsh-chatroom-installed][data-dsh-chatroom-style="qq2007"] .dsh-chatroom-participant-message:is([data-dsh-chatroom-group-position="middle"],[data-dsh-chatroom-group-position="end"]) > .dsh-chatroom-avatar { display:none; }
}
`
