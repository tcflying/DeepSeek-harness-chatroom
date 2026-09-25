import { execFileSync } from 'node:child_process'
const guard = 'G:/CodexData/codex-home/plugins/cache/personal/delivery-guard/0.1.0+codex.20260908124800/scripts/guard.cjs'
const done = process.argv.includes('--verified')
const session = '019fdcf8-20b6-7262-9ac5-d393a238a21e'
const items = [
  { step: 'Inspect original in-app browser and native GPT/M3 failure evidence', status: 'completed' },
  { step: 'Correct test profile instructions and verify real GPT/M3 images in original browser', status: 'completed' },
  { step: 'Attribute initiating trigger of historical 13:34 transport outage', status: 'pending' },
  { step: 'Implement native sidebar connection status and safe reconnect', status: done ? 'completed' : 'in_progress' },
  { step: 'Install sanitized persistent diagnostics and native recurring fault monitoring', status: done ? 'completed' : 'pending' },
  { step: 'Verify isolated faults, both skins, deployed original browser and retained evidence', status: done ? 'completed' : 'pending' },
]
execFileSync(process.execPath, [guard, 'plan', '--session', session, '--items', JSON.stringify(items)], { stdio: 'inherit' })
if (done) execFileSync(process.execPath, [guard, 'release', '--session', session, '--reason', 'UI recovery and prospective fault monitoring verified. Historical 13:34 process-exit trigger cannot be retroactively recovered from absent contemporaneous records; do not manufacture evidence or disrupt production to recreate an unknown incident. New journals and native scheduled monitoring provide prospective timestamps and fault categories.'], { stdio: 'inherit' })
