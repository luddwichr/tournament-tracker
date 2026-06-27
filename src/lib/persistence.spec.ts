import { describe, it, expect } from 'vitest'
import type { Result } from '../types/tournament'
import { parseImport } from './persistence'

function validResult(matchId: string, extra: Partial<Result> = {}): Result {
  return {
    matchId,
    homeGoals: 1,
    awayGoals: 0,
    homeYellow: 0,
    homeRed: 0,
    awayYellow: 0,
    awayRed: 0,
    ...extra,
  }
}

function serialise(results: Record<string, Result>): string {
  return JSON.stringify({ version: 1, results })
}

describe('parseImport', () => {
  it('returns the results map from a valid export', () => {
    const results = { M01: validResult('M01') }
    const out = parseImport(serialise(results))
    expect(out).toEqual(results)
  })

  it('throws on invalid JSON', () => {
    expect(() => parseImport('not json {')).toThrow('Ungültiges JSON-Format.')
  })

  it('throws on wrong version number', () => {
    const json = JSON.stringify({ version: 99, results: {} })
    expect(() => parseImport(json)).toThrow()
  })

  it('throws on missing results key', () => {
    const json = JSON.stringify({ version: 1 })
    expect(() => parseImport(json)).toThrow()
  })

  it('throws on a non-object results value', () => {
    const json = JSON.stringify({ version: 1, results: 'bad' })
    expect(() => parseImport(json)).toThrow()
  })

  it('throws when a result is missing required numeric fields', () => {
    const bad = { matchId: 'M01', homeGoals: 1, awayGoals: 0 } // missing card fields
    const json = JSON.stringify({ version: 1, results: { M01: bad } })
    expect(() => parseImport(json)).toThrow()
  })

  it('accepts results without penaltyWinner (legacy data)', () => {
    const result = { matchId: 'M73', homeGoals: 2, awayGoals: 1, homeYellow: 0, homeRed: 0, awayYellow: 0, awayRed: 0 }
    const json = JSON.stringify({ version: 1, results: { M73: result } })
    expect(() => parseImport(json)).not.toThrow()
  })

  it("accepts penaltyWinner: 'home'", () => {
    const json = serialise({ M73: validResult('M73', { penaltyWinner: 'home' }) })
    expect(() => parseImport(json)).not.toThrow()
  })

  it("accepts penaltyWinner: 'away'", () => {
    const json = serialise({ M73: validResult('M73', { penaltyWinner: 'away' }) })
    expect(() => parseImport(json)).not.toThrow()
  })

  it('accepts penaltyWinner: null', () => {
    const json = serialise({ M73: validResult('M73', { penaltyWinner: null }) })
    expect(() => parseImport(json)).not.toThrow()
  })

  it('throws on an invalid penaltyWinner value', () => {
    const bad = { ...validResult('M73'), penaltyWinner: 'both' }
    const json = JSON.stringify({ version: 1, results: { M73: bad } })
    expect(() => parseImport(json)).toThrow()
  })
})
