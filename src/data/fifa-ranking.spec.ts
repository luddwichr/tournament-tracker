import { describe, expect, it } from 'vitest'

import { fifaRanking } from './fifa-ranking'
import { teams } from './teams'

describe('fifaRanking', () => {
  it('lists all 211 FIFA member associations', () => {
    expect(fifaRanking).toHaveLength(211)
  })

  it('is in ascending rank order, 1 … 211 with no gaps or duplicates', () => {
    expect(fifaRanking.map((e) => e.rank)).toEqual(Array.from({ length: 211 }, (_, i) => i + 1))
  })

  it('is sorted by descending points (best rank = most points)', () => {
    const points = fifaRanking.map((e) => e.points)
    expect(points).toEqual(points.toSorted((a, b) => b - a))
  })

  it('has unique flag codes, each a valid flag-icons code', () => {
    const codes = fifaRanking.map((e) => e.flagCode)
    expect(new Set(codes).size).toBe(codes.length)
    for (const code of codes) {
      expect(code).toMatch(/^[a-z]{2}(-[a-z]{3})?$/)
    }
  })

  it('gives every entry a non-empty name and positive points', () => {
    for (const e of fifaRanking) {
      expect(e.name.length).toBeGreaterThan(0)
      expect(e.points).toBeGreaterThan(0)
    }
  })

  // The ranking and the team list share the 11 June 2026 snapshot. Each World
  // Cup team must appear exactly once, at the position stored in teams.ts.
  it('places every World Cup team at its teams.ts fifaRanking position', () => {
    const byFlag = new Map(fifaRanking.map((e) => [e.flagCode, e]))
    for (const team of teams) {
      const entry = byFlag.get(team.flagCode)
      expect(entry, `no ranking entry for ${team.id} (${team.flagCode})`).toBeDefined()
      expect(entry!.rank, `${team.id} rank mismatch`).toBe(team.fifaRanking)
    }
  })

  // The German name is duplicated between the two files (linked only by
  // flagCode, not a shared id) with no structural guard. RankingView already
  // renders teams.ts's name for WC teams via TeamLabel, so this duplication
  // is otherwise invisible in the UI.
  // Guard it here so a rename in one file that misses the other still fails loudly instead of silently drifting.
  it('agrees with teams.ts on the German name of every World Cup team', () => {
    const byFlag = new Map(fifaRanking.map((e) => [e.flagCode, e]))
    for (const team of teams) {
      const entry = byFlag.get(team.flagCode)
      expect(entry, `no ranking entry for ${team.id} (${team.flagCode})`).toBeDefined()
      expect(entry!.name, `${team.id} name mismatch`).toBe(team.name)
    }
  })
})
