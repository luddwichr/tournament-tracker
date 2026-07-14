import { describe, expect, it } from 'vitest'
import { assertNever } from './assert-never'

describe('assertNever', () => {
  it('throws with the JSON-stringified value and a generic message when no context is given', () => {
    expect(() => assertNever('bogus' as never)).toThrow('Unhandled value: "bogus"')
  })

  it('throws with the given context prefixed to the message', () => {
    expect(() => assertNever({ kind: 'nope' } as never, 'TeamRef kind')).toThrow(
      'Unhandled TeamRef kind: {"kind":"nope"}',
    )
  })
})
