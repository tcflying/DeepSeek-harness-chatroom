import { expect, it, vi } from 'vitest'
import {
  createSessionReentryDiagnostics,
  SESSION_REENTRY_DIAGNOSTIC_PREFIX,
  type SessionReentryDiagnostic,
} from '../src/client/session-reentry-diagnostics.js'

function enter(depth: number, diagnostics: ReturnType<typeof createSessionReentryDiagnostics>): Array<() => void> {
  return Array.from({ length: depth }, () => diagnostics.enter())
}

it('does not capture or report below the synchronous nesting threshold', () => {
  const warn = vi.fn()
  const captureStack = vi.fn(() => 'Error\n    at ignored (https://private.invalid/path?draft=secret:1:2)')
  const diagnostics = createSessionReentryDiagnostics({ warn, captureStack })
  const leaves = enter(5, diagnostics)
  expect(warn).not.toHaveBeenCalled()
  expect(captureStack).not.toHaveBeenCalled()
  leaves.reverse().forEach(leave => leave())
  diagnostics.dispose()
})

it('reports once per lifecycle with only safe frame fields', () => {
  const reports: SessionReentryDiagnostic[] = []
  const diagnostics = createSessionReentryDiagnostics({
    warn: (_prefix, diagnostic) => { reports.push(diagnostic) },
    captureStack: () => [
      'Error: private draft https://private.invalid/path?token=nope',
      '    at Cs.closeEvents (https://private.invalid/client.js?room=private:2308:14)',
      '    at Set.forEach (C:\\private\\plugin.js:2535:36)',
      '    at <anonymous> (https://private.invalid:1:2)',
      '    at bad name (https://private.invalid:3:4)',
    ].join('\n'),
  })
  const leaves = enter(7, diagnostics)
  expect(reports).toEqual([{
    source: 'syncSession',
    depth: 6,
    frames: ['Cs.closeEvents:2308:14', 'Set.forEach:2535:36'],
  }])
  expect(JSON.stringify(reports)).not.toContain('private')
  expect(JSON.stringify(reports)).not.toContain('token')
  leaves.reverse().forEach(leave => leave())
  enter(6, diagnostics).reverse().forEach(leave => leave())
  expect(reports).toHaveLength(1)
  diagnostics.dispose()
})

it('uses the fixed console prefix and restores Error.stackTraceLimit after threshold capture', () => {
  const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const errorConstructor = Error as ErrorConstructor & { stackTraceLimit?: number }
  const prior = errorConstructor.stackTraceLimit
  try {
    errorConstructor.stackTraceLimit = 3
    const diagnostics = createSessionReentryDiagnostics()
    const leaves = enter(6, diagnostics)
    expect(warning).toHaveBeenCalledOnce()
    expect(warning).toHaveBeenCalledWith(
      SESSION_REENTRY_DIAGNOSTIC_PREFIX,
      expect.objectContaining({ source: 'syncSession', depth: 6, frames: expect.any(Array) }),
    )
    expect(errorConstructor.stackTraceLimit).toBe(3)
    leaves.reverse().forEach(leave => leave())
    diagnostics.dispose()
  } finally {
    errorConstructor.stackTraceLimit = prior
    warning.mockRestore()
  }
})

it('does not intercept caller exceptions and keeps late leave callbacks harmless after dispose', () => {
  const diagnostics = createSessionReentryDiagnostics()
  expect(() => {
    const leave = diagnostics.enter()
    try { throw new RangeError('caller failure') } finally { leave() }
  }).toThrow(RangeError)
  const leave = diagnostics.enter()
  diagnostics.dispose()
  leave(); leave()
  expect(() => diagnostics.enter()()).not.toThrow()
})

it('does not let a failing diagnostic sink alter the observed operation', () => {
  const diagnostics = createSessionReentryDiagnostics({ warn: () => { throw new Error('sink failed') } })
  expect(() => enter(7, diagnostics).reverse().forEach(leave => leave())).not.toThrow()
  diagnostics.dispose()
})
