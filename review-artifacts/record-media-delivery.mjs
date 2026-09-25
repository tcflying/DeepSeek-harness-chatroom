import { execFileSync } from 'node:child_process'
const guard = 'G:/CodexData/codex-home/plugins/cache/personal/delivery-guard/0.1.0+codex.20260908124800/scripts/guard.cjs'
const session = '019fdcf8-20b6-7262-9ac5-d393a238a21e'
const items = [
  { step: 'Inspect original in-app browser and native GPT/M3 failure evidence', status: 'completed' },
  { step: 'Correct test profile instructions and verify real GPT/M3 images in original browser', status: 'completed' },
  { step: 'Attribute initiating trigger of historical 13:34 transport outage', status: 'pending' },
  { step: 'Implement native sidebar connection status and safe reconnect', status: 'completed' },
  { step: 'Install sanitized persistent diagnostics and native recurring fault monitoring', status: 'completed' },
  { step: 'Verify isolated faults, both skins, deployed original browser and retained evidence', status: 'completed' },
  { step: 'Diagnose and repair current public disconnects using transport and browser evidence', status: 'completed' },
  { step: 'Add persistent AI avatar editing and prominent add actions', status: 'completed' },
  { step: 'Repair malformed image projection and deliver thumbnails with large-image viewer', status: 'completed' },
  { step: 'Verify isolated regression, deployed browser and update future monitoring evidence', status: 'completed' },
  { step: 'Persist independent thumbnails and deliver full-session gallery with collapsed metadata', status: 'completed' },
  { step: 'Integrate GPT/M3 rectangle editing and CN MiniMax video connector without copying credentials', status: 'completed' },
  { step: 'Verify media close/hidden lifecycle and provider-backed original-browser acceptance', status: 'completed' },
  { step: 'Attribute repeated connection indicators with simultaneous origin bridge and public stream captures', status: 'completed' },
  { step: 'Replace obstructed AI and group panels with top-layer dialogs and fix notification handshake and liveness', status: 'completed' },
  { step: 'Verify current Host integration and original in-app browser with Files sidebar open', status: 'completed' },
  { step: 'Restrict non-admin settings and management across UI and authenticated APIs', status: 'completed' },
  { step: 'Show real last-line model progress and silence age while reasoning or collapsed', status: 'completed' },
  { step: 'Verify role matrix, progress lifecycle, isolated Host and deployed browser', status: 'completed' },
  { step: 'Audit and repair navigation races and server authority edge cases', status: 'completed' },
  { step: 'Optimize both skins, responsive layout, progress and media lifecycle', status: 'completed' },
  { step: 'Verify aggregate CI, isolated Host and current public browser; retain scope limits', status: 'in_progress' },
]
execFileSync(process.execPath, [guard, 'plan', '--session', session, '--items', JSON.stringify(items)], { stdio: 'inherit' })
