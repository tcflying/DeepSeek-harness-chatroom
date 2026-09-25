import { execFileSync } from 'node:child_process'
const guard = 'C:/Users/datoo/.codex/plugins/cache/personal/delivery-guard/0.1.0+codex.20260908124800/scripts/guard.cjs'
const completed = process.argv.includes('--complete')
execFileSync(process.execPath, [guard, 'plan', '--session', '019fdcf8-20b6-7262-9ac5-d393a238a21e', '--items', JSON.stringify([
  { step: '修复消息靠本人头像对齐，并统一替换经典 QQ 头像', status: 'completed' },
  { step: '回归验证并部署到 talk.opcvip.net，核对真实页面', status: completed ? 'completed' : 'in_progress' },
])], { stdio: 'inherit' })
