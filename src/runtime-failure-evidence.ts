/**
 * Privacy-preserving evidence for the one browser failure class where a bare
 * name cannot distinguish a stack overflow.  This module never returns an
 * exception message, a raw stack, a URL, path, query, or arbitrary function
 * name; all callers sanitize again at their trust boundary.
 */
export type RangeErrorSignature = 'stack-overflow' | 'other' | 'unknown'

export type RangeErrorEvidence = {
  readonly signature: RangeErrorSignature
  readonly frames?: readonly string[]
}

const STACK_OVERFLOW = /(?:maximum call stack size exceeded|too much recursion)/iu
const MAX_FRAMES = 12
const MAX_RAW_FRAMES = 64
const MAX_MESSAGE_CHARS = 512
const MAX_STACK_CHARS = 8_192
const MAX_FRAME_CHARS = 128
const MAX_FUNCTION_NAME_CHARS = 64
const MAX_COORDINATE = 100_000_000
const SAFE_FUNCTIONS = new Set([
  'syncSession', 'reconcileSession', 'reconcile', 'emit', 'projectList', 'setDrag', 'resolveNativeOwnership',
  'closeEvents', 'activateSession', 'set', 'apply', 'currentSession', 'select', 'clearSelection', 'refreshList',
])

/** Read a browser error defensively; hostile getters cannot disrupt reporting. */
export function rangeErrorEvidence(error: unknown): RangeErrorEvidence {
  let message: unknown
  try {
    if (error === null || typeof error !== 'object') return { signature: 'unknown' }
    message = (error as { message?: unknown }).message
  } catch {
    return { signature: 'unknown' }
  }
  if (typeof message !== 'string') return { signature: 'unknown' }
  if (!STACK_OVERFLOW.test(message.slice(0, MAX_MESSAGE_CHARS))) return { signature: 'other' }
  let stack: unknown
  try { stack = (error as { stack?: unknown }).stack } catch { return { signature: 'stack-overflow' } }
  try {
    return sanitizeRangeErrorEvidence({ signature: 'stack-overflow', ...(typeof stack === 'string' ? { frames: stackFrames(stack) } : {}) })
      ?? { signature: 'stack-overflow' }
  } catch {
    return { signature: 'stack-overflow' }
  }
}

/** Re-apply the same narrow schema to untrusted browser-to-server evidence. */
export function sanitizeRangeErrorEvidence(value: unknown): RangeErrorEvidence | undefined {
  try {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
    const record = value as { signature?: unknown; frames?: unknown }
    const signature = record.signature
    if (signature !== 'stack-overflow' && signature !== 'other' && signature !== 'unknown') return undefined
    if (signature !== 'stack-overflow') return { signature }
    const rawFrames = record.frames
    if (!Array.isArray(rawFrames)) return { signature }
    const frames: string[] = []
    const limit = Math.min(safeArrayLength(rawFrames), MAX_RAW_FRAMES)
    for (let index = 0; index < limit; index++) {
      let frame: unknown
      try { frame = rawFrames[index] } catch { continue }
      const sanitized = sanitizeFrame(frame)
      if (sanitized !== undefined) frames.push(sanitized)
      if (frames.length === MAX_FRAMES) break
    }
    return frames.length === 0 ? { signature } : { signature, frames }
  } catch {
    return undefined
  }
}

function stackFrames(stack: string): readonly string[] {
  const frames: string[] = []
  const bounded = stack.slice(0, MAX_STACK_CHARS)
  let offset = 0
  let inspected = 0
  while (offset < bounded.length && inspected < MAX_RAW_FRAMES) {
    const end = bounded.indexOf('\n', offset)
    const line = bounded.slice(offset, end === -1 ? bounded.length : end)
    const coordinates = /:(\d+):(\d+)\)?\s*$/u.exec(line)
    if (coordinates !== null) {
      const name = /^\s*at\s+([^\s(]+)/u.exec(line)?.[1]
      const sanitized = makeFrame(name, coordinates[1], coordinates[2])
      if (sanitized !== undefined) frames.push(sanitized)
    }
    if (frames.length === MAX_FRAMES) break
    inspected += 1
    if (end === -1) break
    offset = end + 1
  }
  return frames
}

function sanitizeFrame(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const match = /^([A-Za-z_$][A-Za-z0-9_$.]*|anonymous):(\d+):(\d+)$/u.exec(value.slice(0, MAX_FRAME_CHARS))
  return match === null ? undefined : makeFrame(match[1], match[2], match[3])
}

function makeFrame(rawName: string | undefined, line: string | undefined, column: string | undefined): string | undefined {
  if (line === undefined || column === undefined) return undefined
  const lineNumber = Number(line), columnNumber = Number(column)
  if (!Number.isSafeInteger(lineNumber) || !Number.isSafeInteger(columnNumber)
    || lineNumber < 0 || columnNumber < 0 || lineNumber > MAX_COORDINATE || columnNumber > MAX_COORDINATE) return undefined
  const tail = rawName === undefined || rawName.length > MAX_FUNCTION_NAME_CHARS ? undefined : rawName.split('.').at(-1)
  const name = tail !== undefined && SAFE_FUNCTIONS.has(tail) ? tail : 'anonymous'
  return `${name}:${lineNumber}:${columnNumber}`
}

function safeArrayLength(value: readonly unknown[]): number {
  try {
    const length = value.length
    return Number.isSafeInteger(length) && length >= 0 ? length : 0
  } catch {
    return 0
  }
}
