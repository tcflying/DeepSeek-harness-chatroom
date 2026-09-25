import { execFileSync } from 'node:child_process'
const guard = 'C:/Users/datoo/.codex/plugins/cache/personal/delivery-guard/0.1.0+codex.20260908124800/scripts/guard.cjs'
const session = '019fdcf8-20b6-7262-9ac5-d393a238a21e'
const items = [
  { step: '整合插件改动与发布边界，确认备份和部署目标', status: 'completed' },
  { step: '构建回归、打包及隔离实例业务验收', status: 'completed' },
  { step: '提交推送整合版本，部署现用插件并验收', status: 'in_progress' },
  { step: '完成适用的CDN配置验收与交接记录', status: 'pending' },
]
execFileSync(process.execPath, [guard, 'plan', '--session', session, '--items', JSON.stringify(items)], { stdio: 'inherit' })
execFileSync(process.execPath, [guard, 'release', '--session', session, '--reason',
  '代码已合并推送，正式 rc1.3 已安装且 Servy/本机/LAN/公网认证、两名真实 AI 连续提及四条回复均通过。剩余安装后真实浏览器交互与 Cloudflare 缓存规则读写因浏览器控制面 nodeRepl.fetch request failed、无 Cloudflare 配置工具而无法执行。已做两次有界连接检查及公开资源 DYNAMIC 验证；恢复可操作浏览器后继续页面与现有 CF 规则核对。原生流 finish 延迟的上游细分归因尚无请求时间线；本次整合部署不更换模型或新增流式显示协议。'], { stdio: 'inherit' })
