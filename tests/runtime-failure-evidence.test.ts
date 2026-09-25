import { expect, it } from 'vitest'
import { rangeErrorEvidence, sanitizeRangeErrorEvidence } from '../src/runtime-failure-evidence.js'

it('retains only the stack-overflow signature and fixed safe stack frames', () => {
  const evidence = rangeErrorEvidence(Object.assign(
    new RangeError('Maximum call stack size exceeded: https://private.example/?token=secret'),
    {
      stack: [
        'RangeError: Maximum call stack size exceeded: https://private.example/?token=secret',
        '    at syncSession (https://private.example/client.js:12:34)',
        '    at Cs.closeEvents (C:\\private\\profile.js:56:78)',
        '    at bespokeUserFunction (https://private.example/client.js:90:12)',
      ].join('\n'),
    },
  ))

  expect(evidence).toEqual({
    signature: 'stack-overflow',
    frames: ['syncSession:12:34', 'closeEvents:56:78', 'anonymous:90:12'],
  })
  expect(JSON.stringify(evidence)).not.toContain('private')
  expect(JSON.stringify(evidence)).not.toContain('secret')
})

it('keeps non-matching and hostile RangeErrors de-identified', () => {
  expect(rangeErrorEvidence(new RangeError('private prompt'))).toEqual({ signature: 'other' })
  const hostile = new Proxy({}, { get: () => { throw new Error('private getter') } })
  expect(rangeErrorEvidence(hostile)).toEqual({ signature: 'unknown' })
  expect(sanitizeRangeErrorEvidence({ signature: 'stack-overflow', frames: ['privateName:1:2', 'syncSession:3:4'], raw: 'private' }))
    .toEqual({ signature: 'stack-overflow', frames: ['anonymous:1:2', 'syncSession:3:4'] })
})

it('keeps a recognized overflow signature when the stack getter rejects', () => {
  const error = {
    name: 'RangeError',
    message: 'Maximum call stack size exceeded',
    get stack(): never { throw new Error('private stack getter') },
  }
  expect(rangeErrorEvidence(error)).toEqual({ signature: 'stack-overflow' })
})

it('bounds raw frame inspection without invoking a custom array iterator', () => {
  expect(rangeErrorEvidence({ message: `${'x'.repeat(4_096)}Maximum call stack size exceeded` })).toEqual({ signature: 'other' })
  const frames = Array.from({ length: 64 }, () => 'not-a-frame')
  frames.push('syncSession:1:2')
  expect(sanitizeRangeErrorEvidence({ signature: 'stack-overflow', frames })).toEqual({ signature: 'stack-overflow' })

  const iteratorHostile = new Proxy(['syncSession:3:4'], {
    get(target, property, receiver) {
      if (property === Symbol.iterator) throw new Error('private iterator')
      return Reflect.get(target, property, receiver)
    },
  })
  expect(sanitizeRangeErrorEvidence({ signature: 'stack-overflow', frames: iteratorHostile }))
    .toEqual({ signature: 'stack-overflow', frames: ['syncSession:3:4'] })
})
