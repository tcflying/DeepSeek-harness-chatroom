/** One-shot observation. Scheduling belongs to the native Codex heartbeat. */
import { readFile, mkdir, appendFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

/** Node reads this setting at startup; preserve configured proxy and NO_PROXY routing for the one-shot observer. */
export function needsEnvironmentProxy(env = process.env) {
  return env.NODE_USE_ENV_PROXY !== '1' && ['HTTPS_PROXY', 'HTTP_PROXY', 'ALL_PROXY'].some(name => typeof env[name] === 'string' && env[name].trim() !== '')
}

/** NODE_USE_ENV_PROXY is available from Node 24.0.0 and its Node 22.21.0 LTS backport. */
export function supportsEnvironmentProxy(version = process.versions.node) {
  const match = /^(\d+)\.(\d+)\./.exec(version)
  if (match === null) return false
  const major = Number(match[1]), minor = Number(match[2])
  return major >= 24 || (major === 22 && minor >= 21)
}

export function environmentProxyMode(env = process.env, version = process.versions.node) {
  if (!['HTTPS_PROXY', 'HTTP_PROXY', 'ALL_PROXY'].some(name => typeof env[name] === 'string' && env[name].trim() !== '')) return 'not-configured'
  if (!supportsEnvironmentProxy(version)) return 'unsupported'
  if (env.NODE_USE_ENV_PROXY === '1') return 'enabled'
  return 'restart-required'
}

export async function probe(name, url, request = fetch) {
  const started = Date.now()
  let httpStatus
  try {
    const response = await request(url, { redirect: 'error', signal: AbortSignal.timeout(8000) })
    httpStatus = response.status
    const value = await response.json()
    const ready = name === 'opencodex' ? value.status === 'ok' && value.service === 'opencodex' : value.ready === true
    return { name, healthy: response.ok && ready, status: response.status, elapsedMs: Date.now() - started,
      ...(name === 'opencodex' && Number.isSafeInteger(value.pid) ? { pid: value.pid, uptime: Math.floor(value.uptime ?? 0) } : {}),
      ...(name === 'origin-bridge' ? { pid: value.pid, upstreamActive: value.upstreamActive, upstreamErrors: value.upstreamErrors, websocketOpened: value.websocketOpened, websocketClosed: value.websocketClosed } : {}),
      ...(value.diagnostics ? { journalHealthy: value.diagnostics.enabled === true && value.diagnostics.healthy === true && value.diagnostics.dropped === 0 } : {}),
    }
  } catch (error) {
    const code = error?.cause?.code ?? error?.code
    return { name, healthy: false, elapsedMs: Date.now() - started,
      ...(httpStatus ? { status: httpStatus } : {}),
      error: ['TimeoutError', 'AbortError', 'SyntaxError', 'TypeError'].includes(error?.name) ? error.name : 'Error',
      ...(typeof code === 'string' && /^(?:E[A-Z0-9_]+|UND_ERR_[A-Z_]+)$/.test(code) ? { code } : {}),
    }
  }
}

export async function observe(directory, journalDirectory, request = fetch, options = {}) {
  const at = new Date().toISOString()
  const previous = await readFile(join(directory, 'latest.json'), 'utf8').then(JSON.parse).catch(() => undefined)
  const publicProbe = options.publicProbe ?? 'enabled'
  const services = await Promise.all([
    probe('chatroom-local', 'http://127.0.0.1:3181/plugins/deepseek-harness-chatroom/api/health', request),
    publicProbe === 'enabled'
      ? probe('chatroom-public', 'https://talk.opcvip.net/plugins/deepseek-harness-chatroom/api/health', request)
      : Promise.resolve({ name: 'chatroom-public', observed: false, reason: publicProbe }),
    probe('opencodex', 'http://127.0.0.1:10100/healthz', request),
    probe('origin-bridge', 'http://127.0.0.1:3185/__bridge_health', request),
  ])
  const records = []
  // A paused scheduler may have hours of unread history. Preserve that failure
  // backlog below, but never label all of its closes as a current burst.
  const transportWindowSeconds = 300
  const transportWindowEnd = Date.parse(at)
  const transportWindowStart = transportWindowEnd - transportWindowSeconds * 1000
  const transportCloses = []
  let journalFiles = 0
  let latestJournalAt
  let latestProviderAt
  for (const suffix of ['.3', '.2', '.1', '']) {
    const content = await readFile(join(journalDirectory, `events.jsonl${suffix}`), 'utf8').then(value => { journalFiles++; return value }).catch(() => '')
    for (const line of content.split('\n')) {
      try {
        const record = JSON.parse(line)
        if (!latestJournalAt || record.at > latestJournalAt) latestJournalAt = record.at
        if (record.event === 'provider.probe' && (!latestProviderAt || record.at > latestProviderAt)) latestProviderAt = record.at
        const recordAt = Date.parse(record.at)
        if (record.event === 'native.close' && record.reason !== 'plugin-stop'
          && recordAt >= transportWindowStart && recordAt <= transportWindowEnd) transportCloses.push(record)
        if (record.at > (previous?.at ?? at)) records.push(record)
      } catch { /* truncated crash tail */ }
    }
  }
  const failures = records.filter(r => ['image.failure', 'llm.failure', 'media.failure', 'native.failure', 'native.auth.failure', 'native.session-list.timeout', 'client.runtime.failure'].includes(r.event) || (r.event === 'room.select.stage' && r.roomSelection?.outcome === 'failure') || (r.event === 'turn.end' && r.outcome === 'error') || (r.event === 'provider.probe' && r.healthy === false))
  const shortCloses = transportCloses.filter(r => Number.isFinite(r.elapsedMs) && r.elapsedMs >= 0 && r.elapsedMs < 15000)
  const transport = { windowSeconds: transportWindowSeconds, closes: transportCloses.length, shortCloses: shortCloses.length, flapping: shortCloses.length >= 3 }
  const bridge = services.find(s => s.name === 'origin-bridge')
  const previousBridge = previous?.services?.find(s => s.name === 'origin-bridge')
  const comparableBridge = Number.isSafeInteger(bridge?.pid) && bridge.pid > 0 && bridge.pid === previousBridge?.pid
    && Number.isSafeInteger(bridge.upstreamErrors) && Number.isSafeInteger(previousBridge.upstreamErrors)
  const origin = { possibleLeak: bridge?.upstreamActive > 200, newUpstreamErrors: comparableBridge ? Math.max(0, bridge.upstreamErrors - previousBridge.upstreamErrors) : 0 }
  const evidenceHealthy = journalFiles > 0 && latestProviderAt !== undefined && Date.parse(at) - Date.parse(latestProviderAt) < 180_000
  const statusKey = JSON.stringify([services.map(s => [s.name, s.healthy, s.journalHealthy, s.pid]), evidenceHealthy, transport.flapping, origin.possibleLeak])
  const result = { at, previousAt: previous?.at, gapSeconds: previous ? Math.round((Date.parse(at) - Date.parse(previous.at)) / 1000) : undefined,
    services, transport, origin, newFailures: failures.slice(-40), newFailureCount: failures.length,
    evidenceHealthy, latestJournalAt, latestProviderAt,
    ...(publicProbe === 'proxy-unsupported' ? { localDiagnostic: { code: 'proxy-unsupported', nodeVersion: options.nodeVersion } } : {}),
    changed: statusKey !== previous?.statusKey, statusKey,
    limitations: `Health is not paid provider/image success; outages between snapshots can be missed. Plugin journal captures actual invocation failures. Native heartbeat requires the host app and machine to run.${publicProbe === 'proxy-unsupported' ? ' Public health was not probed because this Node version cannot honor the configured environment proxy.' : ''}`,
  }
  await mkdir(directory, { recursive: true })
  const file = join(directory, 'observations.jsonl')
  if (await stat(file).then(s => s.size >= 2 * 1024 * 1024).catch(() => false)) {
    await rm(file + '.3', { force: true })
    for (let i = 2; i >= 0; i--) await rename(i ? `${file}.${i}` : file, `${file}.${i + 1}`).catch(e => { if (e.code !== 'ENOENT') throw e })
  }
  await appendFile(file, JSON.stringify(result) + '\n', { mode: 0o600 })
  await writeFile(join(directory, 'latest.json.tmp'), JSON.stringify(result, null, 2), { mode: 0o600 })
  await rename(join(directory, 'latest.json.tmp'), join(directory, 'latest.json'))
  return result
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const proxyMode = environmentProxyMode()
  if (proxyMode === 'restart-required') {
    const child = spawn(process.execPath, [...process.execArgv, process.argv[1], ...process.argv.slice(2)], {
      stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1' },
    })
    const [code, signal] = await once(child, 'exit')
    process.exitCode = signal ? 1 : (code ?? 1)
  } else {
    const base = 'C:/Users/datoo/.dsh/chatroom-server/chatroom/diagnostics'
    console.log(JSON.stringify(await observe(join(base, 'observer'), base, fetch, proxyMode === 'unsupported'
      ? { publicProbe: 'proxy-unsupported', nodeVersion: process.versions.node }
      : undefined), null, 2))
  }
}
