// Read one user-designated existing job; never submit or download anything here.
import { writeFile } from 'node:fs/promises'
import { miniMaxConnector } from '../src/minimax-code.ts'
const result = await miniMaxConnector('C:/Users/datoo/.minimax/bin/mcode-tools.cmd', 'query_video_generation', { task_id: '440584292126997', model: 'MiniMax-H3' })
function safe(value) {
  if (Array.isArray(value)) return value.map(safe)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, /token|secret|signature|credential/i.test(key) ? '[redacted]' : safe(val)]))
  if (typeof value === 'string' && /^https?:/.test(value)) return { hostname: new URL(value).hostname, hasQuery: !!new URL(value).search }
  return value
}
const evidence = safe(result)
await writeFile(new URL('./MINIMAX-EXISTING-VIDEO-20260911.json', import.meta.url), JSON.stringify(evidence, null, 2))
console.log(JSON.stringify(evidence))
