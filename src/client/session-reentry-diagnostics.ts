/**
 * Local, opt-in evidence for a same-tick recursive `syncSession` call chain.
 *
 * Callers must pair `enter()` with its returned leave function in `finally`.
 * This helper neither catches the caller's exceptions nor invokes navigation,
 * permission, network, or Session APIs.
 */
export const SESSION_REENTRY_DIAGNOSTIC_PREFIX = '[chatroom:syncSession-reentry]'

const REENTRY_DEPTH = 6
const MAX_STACK_FRAMES = 40
const SAFE_FUNCTION_NAME = /^[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*$/

export type SessionReentryDiagnostic = {
  readonly source: 'syncSession'
  readonly depth: number
  /** Function name plus line and column only: never a URL, path, query, or error text. */
  readonly frames: readonly string[]
}

export type SessionReentryDiagnostics = {
  /** Enter one synchronous `syncSession` invocation and receive its idempotent leave callback. */
  enter(): () => void
  /** End this diagnostic lifecycle. Existing leave callbacks remain harmless. */
  dispose(): void
}

export type SessionReentryDiagnosticsOptions = {
  /** Tests may replace the local console sink; production uses console.warn. */
  warn?: (prefix: string, diagnostic: SessionReentryDiagnostic) => void
  /** Test seam for hostile-stack privacy assertions; production captures a new empty Error. */
  captureStack?: () => string | undefined
}

/**
 * Report the first depth-six-or-greater nesting only. Stack capture is deferred
 * until that threshold, then strips every raw stack field before reporting.
 */
export function createSessionReentryDiagnostics(
  options: SessionReentryDiagnosticsOptions = {},
): SessionReentryDiagnostics {
  let depth = 0
  let reported = false
  let disposed = false
  const warn = options.warn ?? ((prefix, diagnostic) => { console.warn(prefix, diagnostic) })
  const captureStack = options.captureStack ?? captureDiagnosticStack

  return {
    enter: () => {
      if (disposed) return () => undefined
      depth += 1
      if (!reported && depth >= REENTRY_DEPTH) {
        reported = true
        // Diagnostics must never retain a raw stack. A capture failure simply
        // yields no frames and does not change the observed call chain.
        let frames: readonly string[] = []
        try { frames = safeStackFrames(captureStack()) } catch {}
        try { warn(SESSION_REENTRY_DIAGNOSTIC_PREFIX, { source: 'syncSession', depth, frames }) } catch {
          // A broken diagnostic sink must not change native navigation.
        }
      }
      let left = false
      return () => {
        if (left) return
        left = true
        depth = Math.max(0, depth - 1)
      }
    },
    dispose: () => { disposed = true; depth = 0 },
  }
}

/** Capture more than the browser default only at the threshold, then restore it immediately. */
function captureDiagnosticStack(): string | undefined {
  const errorConstructor = Error as ErrorConstructor & { stackTraceLimit?: number }
  const hadStackTraceLimit = Object.prototype.hasOwnProperty.call(errorConstructor, 'stackTraceLimit')
  const previousLimit = errorConstructor.stackTraceLimit
  try {
    errorConstructor.stackTraceLimit = MAX_STACK_FRAMES
    return new Error().stack
  } finally {
    if (hadStackTraceLimit) errorConstructor.stackTraceLimit = previousLimit
    else Reflect.deleteProperty(errorConstructor, 'stackTraceLimit')
  }
}

/** Keep only allowlisted function labels and numeric line/column coordinates from V8-style frames. */
function safeStackFrames(stack: string | undefined): readonly string[] {
  if (typeof stack !== 'string') return []
  const frames: string[] = []
  for (const raw of stack.split('\n')) {
    const match = /^\s*at\s+(.+?)\s+\([^()]*:(\d+):(\d+)\)\s*$/.exec(raw)
    if (match === null) continue
    const [, name, line, column] = match
    if (name === undefined || line === undefined || column === undefined || !SAFE_FUNCTION_NAME.test(name)) continue
    frames.push(`${name}:${line}:${column}`)
    if (frames.length === MAX_STACK_FRAMES) break
  }
  return frames
}
