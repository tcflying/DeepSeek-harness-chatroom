/** Isolated read-only invocation of the installed persistence service; never patches Host. */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { performance, monitorEventLoopDelay } from 'node:perf_hooks'

const source = 'C:/Users/datoo/.dsh/service/host-0.1.5-rc.1/node_modules/@deepseek-ai/dsh-session-persistence-jsonl/lib/index.js'
const require = createRequire(source)
const { Context } = await import(pathToFileURL(require.resolve('@deepseek-ai/cordis')).href)
const { default: Persistence } = await import(pathToFileURL(source).href)
const hash = async () => createHash('sha256').update(await readFile(source)).digest('hex')
const before = await hash()
const result = { at: new Date().toISOString(), boundary: 'Independent Context invokes installed JSONL list API against the existing root. No write handles, no migrations, no live Host context, no source patch, no catalogue data retained. This is not in-Host tracing.', sourceHash: before, observations: [] }
const ctx = new Context()
const fiber = ctx.plugin(Persistence, { root: 'C:/Users/datoo/.dsh/chatroom-server/sessions', compression: 'zstd' })
const loop = monitorEventLoopDelay({ resolution: 20 })
loop.enable()
try {
  await fiber
  const persistence = ctx.get('sessionPersistence')
  if (!persistence) throw new Error('Persistence service was not mounted')
  for (const mode of ['cold-root-check', 'warm-root-check']) {
    const started = performance.now()
    const rows = await persistence.list({ signal: AbortSignal.timeout(30_000) })
    result.observations.push({ mode, items: rows.length, elapsedMs: Math.round(performance.now() - started) })
  }
} catch (error) { result.error = { kind: error.name, message: error.message.startsWith('Persistence service') ? error.message : undefined } }
finally { await fiber.dispose(); loop.disable() }
result.sourceUnchanged = before === await hash()
result.eventLoop = { p99Ms: Math.round(loop.percentile(99) / 1e6), maxMs: Math.round(loop.max / 1e6) }
result.completedAt = new Date().toISOString()
result.observationComplete = result.observations.length === 2 && result.sourceUnchanged && !result.error
await writeFile(new URL('NATIVE-PERSISTENCE-20260913-r1.json', import.meta.url), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' })
console.log(JSON.stringify(result, null, 2))
if (!result.observationComplete) process.exitCode = 1
