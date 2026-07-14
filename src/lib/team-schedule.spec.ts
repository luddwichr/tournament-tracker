/**
 * Unit tests for matchesForTeam / computeTeamStats — the per-team schedule
 * and overall-stats aggregation used by TeamDialog.
 *
 * Uses real fixture data (Germany, group A) so we test the actual production
 * function against real match ids, not a re-implemented copy.
 */

import { describe, it, expect } from 'vitest'
import { matchesForTeam, computeTeamStats } from './team-schedule'
import { teamsById } from '../data/teams'
import { makeResult, resultsMap } from '../test-support/results'

const ger = teamsById.get('ger')!

// Germany's three group matches, chronological: M09 (home), M34 (home), M56 (away)

describe('matchesForTeam', () => {
  it('returns all group matches involving the team when no results are entered', () => {
    const entries = matchesForTeam(ger, {})
    expect(entries.map((e) => e.match.id)).toEqual(['M09', 'M34', 'M56'])
  })

  it('leaves result null and both teams resolved for group matches', () => {
    const entries = matchesForTeam(ger, {})
    for (const entry of entries) {
      expect(entry.result).toBeNull()
      expect(entry.homeTeam).not.toBeNull()
      expect(entry.awayTeam).not.toBeNull()
    }
  })

  it('attaches the entered result to the matching entry', () => {
    const entries = matchesForTeam(ger, resultsMap(makeResult('M09', 3, 0)))
    const m09 = entries.find((e) => e.match.id === 'M09')!
    expect(m09.result).toEqual(expect.objectContaining({ awayGoals: 0, homeGoals: 3 }))
  })

  it('does not include knockout matches while the bracket has not resolved to the team', () => {
    const entries = matchesForTeam(ger, {})
    expect(entries.every((e) => e.match.stage === 'group')).toBe(true)
  })
})

describe('computeTeamStats', () => {
  it('counts a win, a draw, and a loss correctly regardless of home/away side', () => {
    const entries = matchesForTeam(
      ger,
      resultsMap(
        makeResult('M09', 3, 0), // ger home, win
        makeResult('M34', 1, 1), // ger home, draw
        makeResult('M56', 2, 1), // ger away, loss
      ),
    )
    const stats = computeTeamStats(ger, entries)
    expect(stats.played).toBe(3)
    expect(stats.wins).toBe(1)
    expect(stats.draws).toBe(1)
    expect(stats.losses).toBe(1)
    expect(stats.goalsFor).toBe(3 + 1 + 1)
    expect(stats.goalsAgainst).toBe(0 + 1 + 2)
  })

  it('attributes cards from the correct side, including when the team plays away', () => {
    const entries = matchesForTeam(
      ger,
      resultsMap(makeResult('M56', 2, 1, { awayRed: 0, awayYellow: 2, homeRed: 1, homeYellow: 4 })),
    )
    const stats = computeTeamStats(ger, entries)
    expect(stats.yellowCards).toBe(2)
    expect(stats.redCards).toBe(0)
  })

  it('ignores unplayed matches', () => {
    const entries = matchesForTeam(ger, {})
    const stats = computeTeamStats(ger, entries)
    expect(stats.played).toBe(0)
    expect(stats.wins).toBe(0)
    expect(stats.draws).toBe(0)
    expect(stats.losses).toBe(0)
  })
})
