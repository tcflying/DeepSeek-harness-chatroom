import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'

const hours = Number(process.argv.find(value => value.startsWith('--hours='))?.slice('--hours='.length) ?? 6)
if (!Number.isFinite(hours) || hours <= 0) throw new Error('hours must be a positive number')

const diagnosticsDirectory = 'C:/Users/datoo/.dsh/chatroom-server/chatroom/diagnostics'
const bridgeDirectory = 'C:/ProgramData/Servy/managed-logs'
const output = new URL('./RC133-connection-audit.json', import.meta.url)
const generatedAtMs = Date.now()
const windowStartMs = generatedAtMs - hours * 60 * 60 * 1000

const increment = (target, key) => { target[key] = (target[key] ?? 0) + 1 }
const summarize = values => {
  if (values.length === 0) return { samples: 0 }
  const ordered = [...values].sort((left, right) => left - right)
  return {
    samples: values.length,
    minimumMs: ordered[0],
    medianMs: ordered[Math.floor(ordered.length / 2)],
    meanMs: Math.round(values.reduce((total, value) => total + value, 0) / values.length),
    maximumMs: ordered.at(-1),
  }
}

async function matchingFiles(directory, matches) {
  const candidates = (await readdir(directory)).filter(matches).map(name => join(directory, name))
  const metadata = await Promise.all(candidates.map(async path => ({ path, metadata: await stat(path) })))
  return metadata.filter(item => item.metadata.isFile()).map(item => item.path)
}

async function readEvents(paths) {
  const summary = { parsedLines: 0, malformedLines: 0, undatedLines: 0 }
  const events = []
  for (const path of paths) {
    const contents = await readFile(path, 'utf8')
    for (const line of contents.split(/\r?\n/u)) {
      if (line.trim() === '') continue
      let record
      try {
        record = JSON.parse(line)
        summary.parsedLines += 1
      } catch {
        summary.malformedLines += 1
        continue
      }
      // Do not deserialize `at` through PowerShell/Date: Date.parse on the raw
      // RFC3339 string preserves the trailing Z UTC offset.
      const epochMs = typeof record.at === 'string' ? Date.parse(record.at) : Number.NaN
      if (!Number.isFinite(epochMs)) {
        summary.undatedLines += 1
        continue
      }
      if (epochMs >= windowStartMs && epochMs <= generatedAtMs) events.push({ ...record, epochMs })
    }
  }
  return { events, summary }
}

function eventsByName(events) {
  const counts = {}
  for (const event of events) increment(counts, String(event.event ?? 'unknown'))
  return counts
}

function reasonCounts(events, name) {
  const counts = {}
  for (const event of events) if (event.event === name) increment(counts, String(event.reason ?? 'unknown'))
  return counts
}

function errorCounts(events, name) {
  const counts = {}
  for (const event of events) if (event.event === name) increment(counts, String(event.error?.httpStatus ?? event.error?.code ?? event.code ?? 'unknown'))
  return counts
}

function nextOpenDelay(events) {
  const opens = events.filter(event => event.event === 'sse.open').sort((left, right) => left.epochMs - right.epochMs)
  const delays = []
  for (const close of events.filter(event => event.event === 'sse.close')) {
    const next = opens.find(open => open.epochMs > close.epochMs && open.stream === close.stream)
    if (next !== undefined) delays.push(next.epochMs - close.epochMs)
  }
  return summarize(delays)
}

function runtimePairs(events) {
  const starts = events.filter(event => event.event === 'runtime.start').sort((left, right) => left.epochMs - right.epochMs)
  return events.filter(event => event.event === 'runtime.stop').sort((left, right) => left.epochMs - right.epochMs).map(stop => {
    const start = starts.find(candidate => candidate.epochMs > stop.epochMs)
    return {
      stoppedAtUtc: stop.at,
      ...(start === undefined ? { restartObserved: false } : {
        restartObserved: true,
        startedAtUtc: start.at,
        elapsedMs: start.epochMs - stop.epochMs,
      }),
    }
  })
}

const diagnosticPaths = await matchingFiles(diagnosticsDirectory, name => name === 'events.jsonl' || /^events\.jsonl\./u.test(name))
const bridgePaths = await matchingFiles(bridgeDirectory, name => /^dsh-chatroom-origin\.(out|err)\.log(?:\.|$)/u.test(name))
const diagnostics = await readEvents(diagnosticPaths)
const bridge = await readEvents(bridgePaths)
const states = diagnostics.events.filter(event => event.event === 'client.connection').map(event => event.connectionState).filter(Boolean)

const audit = {
  schemaVersion: 1,
  generatedAtUtc: new Date(generatedAtMs).toISOString(),
  window: {
    durationHours: hours,
    startUtc: new Date(windowStartMs).toISOString(),
    endUtc: new Date(generatedAtMs).toISOString(),
    timeParsing: 'Date.parse(raw RFC3339 at string); a trailing Z remains UTC.',
  },
  sources: {
    diagnostics: {
      directory: diagnosticsDirectory,
      selectedFiles: diagnosticPaths.map(path => basename(path)),
      rotationsIncluded: diagnosticPaths.some(path => basename(path) !== 'events.jsonl'),
      ...diagnostics.summary,
      inWindowEvents: diagnostics.events.length,
    },
    originBridge: {
      directory: bridgeDirectory,
      selectedFiles: bridgePaths.map(path => basename(path)),
      rotationsIncluded: bridgePaths.some(path => !['dsh-chatroom-origin.out.log', 'dsh-chatroom-origin.err.log'].includes(basename(path))),
      ...bridge.summary,
      inWindowEvents: bridge.events.length,
    },
  },
  diagnostics: {
    events: eventsByName(diagnostics.events),
    sseCloseReasons: reasonCounts(diagnostics.events, 'sse.close'),
    nativeCloseReasons: reasonCounts(diagnostics.events, 'native.close'),
    nativeFailures: errorCounts(diagnostics.events, 'native.failure'),
    nativeAuthFailures: errorCounts(diagnostics.events, 'native.auth.failure'),
    clientConnectionStates: {
      explicitHidden: states.filter(state => state.visible === false).length,
      explicitOffline: states.filter(state => state.online === false).length,
      nativeDisconnectedWhileVisibleAndOnline: states.filter(state => state.native === 'disconnected' && state.visible === true && state.online === true).length,
    },
    runtimeStopStart: runtimePairs(diagnostics.events),
    serverSideSameStreamNextOpenDelay: {
      ...nextOpenDelay(diagnostics.events),
      limitation: 'This only observes the next server-side open for the same stream label. There is no browser/tab/client identifier, so it is not a same-browser recovery duration and must not be attributed to a user, tab visibility, or network cause.',
    },
  },
  originBridge: {
    events: eventsByName(bridge.events),
    webSocketCloseReasons: reasonCounts(bridge.events, 'bridge.ws.close'),
    httpFailures: errorCounts(bridge.events, 'bridge.http.failure'),
  },
  causeAssessment: {
    pageHidden: 'No client.connection event in this window explicitly reported visible:false. Absence is not proof that no page was hidden.',
    networkOffline: 'No client.connection event in this window explicitly reported online:false. ECONNRESET and ETIMEDOUT are transport/request failures, not a browser-offline diagnosis.',
    processLifecycle: 'runtime.stop/start pairs are observed above; they establish process lifecycle timing only, not why the runtime stopped.',
    userAction: 'No event carries a user-action or browser-tab identity. bridge client-close cannot be classified as a user action from these logs alone.',
    providerHealth: 'provider.probe is excluded from causal attribution; it is not evidence that a connection failure was provider-caused.',
    historical1334: 'The historical 13:34 trigger remains unknown. This audit does not retroactively classify it as hidden-page, network, process exit, or resolved.',
    newFault: 'The window contains real closes, runtime restarts, and bridge transport failures. Without a prior comparable baseline or correlated browser identifiers, this audit cannot label them a new incident or a resolved historical fault.',
  },
}

await writeFile(output, `${JSON.stringify(audit, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ output: output.pathname, diagnostics: audit.sources.diagnostics.inWindowEvents, bridge: audit.sources.originBridge.inWindowEvents }))
