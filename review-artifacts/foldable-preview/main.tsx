import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ChatroomSettingsSection } from '../../src/client/ChatroomAccountPanels'
import { ChatroomSessionControls } from '../../src/client/ChatroomComposer'
import { CHATROOM_STYLES } from '../../src/client/styles'
import { CHATROOM_RESPONSIVE_STYLES } from '../../src/client/responsive-styles'
import type { ChatroomView } from '../../src/client/store'

const style = document.createElement('style')
style.id = 'plugin-responsive-style'
style.textContent = CHATROOM_RESPONSIVE_STYLES
document.head.append(style)
const noop = async () => undefined
const demo = { auth:{ enabled:true, authenticated:true, canManageSettings:false, account:{
  participantId:'layout', username:'layout', displayName:'布局验收成员', role:'member', status:'active', passwordManaged:false,
} }, manageableRooms:[{ id:'layout-room', title:'折叠屏专项 · 模型与成员设置' }], agentProfilesRoomId:'layout-room',
agentProfiles:{ canManage:true, profiles:[], models:[{ provider:'preview', model:'layout-only', label:'布局示例（不连接模型）', reasoningEfforts:['high','max'] }] },
wecomAuthorization:{ enabled:false, status:'unauthorized' }, rooms:[] } as unknown as ChatroomView

function Preview() {
  const [mode, setMode] = useState('settings')
  const [draft, setDraft] = useState('折回或展开后，这段未发送文字应该保留。')
  return <>
    <style>{`body{margin:0;font:14px/1.5 system-ui,sans-serif;background:#f4f5f7;color:#202226}
      :root{--dsw-alias-label-primary:#202226;--dsw-alias-label-secondary:#505666;--dsw-alias-label-tertiary:#6a7180;--dsw-alias-border-l2:#dce0e6;--dsw-alias-bg-module-platform:#f4f5f7;--dsw-alias-bg-layer-3:#fff;--dsw-alias-bg-layer-1:#fff;--dsw-alias-button-primary-fill:#202226;--dsw-alias-label-primary-foreground:#fff}
      .preview-bar{position:fixed;inset:0 0 auto;background:#fff6d9;z-index:999;display:flex;gap:8px;align-items:center;padding:6px 12px;white-space:nowrap;overflow-x:auto;font-size:12px}
      .preview-bar button{padding:6px 10px;border:1px solid #ccc;border-radius:8px;background:white}
      .preview-shell{display:flex;position:fixed;top:48px;bottom:8px;left:8px;right:8px;margin:auto;background:#fff;border:1px solid #ddd;border-radius:16px;overflow:hidden;width:min(1100px,calc(100% - 16px))}
      .preview-shell>nav{flex:0 0 188px;box-sizing:border-box;display:flex;flex-direction:column;padding:22px 12px;gap:10px;background:#fafafa}
      .preview-shell>nav>div{display:flex;flex-direction:column;gap:4px}.preview-shell nav button{border:0;padding:10px;background:transparent;text-align:left;border-radius:8px}
      .preview-shell nav button:last-child{background:#e9edf3}
      .preview-shell>div{display:flex;flex:1;min-width:0;min-height:0;flex-direction:column}.preview-shell .toolbar{padding:8px 14px;text-align:right}
      .preview-options{overflow:auto;padding:0 24px 24px}[data-slot]{display:contents}
      ${CHATROOM_STYLES}
      .preview-shell:has(.dsh-chatroom-settings){height:auto;max-height:calc(100dvh - 64px);margin:auto}
      .preview-chat{top:44px}.preview-chat p{margin:8px 0}.preview-chat .dsh-chatroom-session-controls{margin-left:8px}
    `}</style>
    <div className="preview-bar"><strong>插件专项预览 · 非生产／不连接账号与模型</strong><button onClick={()=>setMode('settings')}>设置布局</button><button onClick={()=>setMode('chat')}>聊天布局</button></div>
    {mode === 'settings' ? <div role="dialog" aria-label="设置预览" className="preview-shell">
      <nav><div>设置</div><div><button>通用设置</button><button>模型</button><button>Agent 预设</button><button>群聊与账号</button></div></nav>
      <div><header className="toolbar">只读测试环境 · 保存不会写入服务</header><div className="preview-options"><div data-slot="settings.section">
        <ChatroomSettingsSection {...({ useChatroom:(select:(view:ChatroomView)=>unknown)=>select(demo), logout:noop, openAdmin:noop,
          saveAgentProfile:async()=>false, changePassword:async()=>false } as unknown as Parameters<typeof ChatroomSettingsSection>[0])} />
      </div></div></div>
    </div> : <section className="dsh-chatroom-direct-panel preview-chat"><header><span>群</span><div><strong>多人多 Agent · 布局样例</strong><small>仅检验组件与样式，不代表消息投递验收</small></div></header>
      <div className="dsh-chatroom-direct-messages">{Array.from({length:16},(_,i)=><article key={i} className="dsh-chatroom-participant-message dsh-chatroom-direct-message"><span className="dsh-chatroom-direct-message-avatar">{i%2?'AI':'人'}</span><div className="dsh-chatroom-message-column"><span className="dsh-chatroom-human-bubble"><strong>{i%2?'评审员':'参与者'} · 布局样例 {i+1}</strong><p>保留清晰的文本、触控操作与有效聊天面积。展开屏幕时使用更多内容宽度，窄面板不挤出按钮。</p></span></div></article>)}</div>
      <form className="dsh-chatroom-direct-composer" onSubmit={e=>e.preventDefault()}><textarea aria-label="布局测试草稿" value={draft} onChange={e=>setDraft(e.target.value)} /><div className="dsh-chatroom-direct-composer-tools"><button type="button">附件</button>
        <ChatroomSessionControls {...({ useChatroom:(s:(v:ChatroomView)=>unknown)=>s(demo), useSession:(s:(v:unknown)=>unknown)=>s({running:false}), resolveTarget:()=>({kind:'room',room:{id:'layout-room'}}), quickMeeting:noop,newRoomSession:noop,stopRoomSession:noop } as unknown as Parameters<typeof ChatroomSessionControls>[0])} />
        <button className="dsh-chatroom-direct-send" type="button" aria-label="发送（仅布局）">↑</button></div></form>
    </section>}
  </>
}
createRoot(document.getElementById('root')!).render(<Preview />)
