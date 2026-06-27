/**
 * Unit tests for third-place ranking and slot resolution.
 */

import { describe, it, expect } from 'vitest'
import type { Result } from '../types/tournament'
import { GROUP_IDS } from '../types/tournament'
import { groupMatches } from '../data/fixtures-2026'
import { rankThirdPlaced, resolveThirdPlaceSlot } from './third-place'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResult(
  matchId: string,
  homeGoals: number,
  awayGoals: number,
  opts: { homeYellow?: number; homeRed?: number; awayYellow?: number; awayRed?: number } = {},
): Result {
  return {
    matchId,
    homeGoals,
    awayGoals,
    homeYellow: opts.homeYellow ?? 0,
    homeRed: opts.homeRed ?? 0,
    awayYellow: opts.awayYellow ?? 0,
    awayRed: opts.awayRed ?? 0,
  }
}

/**
 * Build a results map where every group match plays out as the given score,
 * with per-matchId overrides.
 */
function allGroupResults(
  defaultHome: number,
  defaultAway: number,
  overrides: Record<string, [number, number]> = {},
): Record<string, Result> {
  const results: Record<string, Result> = {}
  for (const match of groupMatches) {
    const [h, a] = overrides[match.id] ?? [defaultHome, defaultAway]
    results[match.id] = makeResult(match.id, h, a)
  }
  return results
}

// ---------------------------------------------------------------------------
// rankThirdPlaced
// ---------------------------------------------------------------------------

describe('rankThirdPlaced', () => {
  it('returns null when no matches have been played', () => {
    expect(rankThirdPlaced({})).toBeNull()
  })

  it('returns null when only some groups are complete', () => {
    const partial: Record<string, Result> = {}
    groupMatches
      .filter((m) => m.group === 'A')
      .forEach((m) => {
        partial[m.id] = makeResult(m.id, 1, 0)
      })
    expect(rankThirdPlaced(partial)).toBeNull()
  })

  it('returns exactly 12 teams when all groups are complete', () => {
    const ranked = rankThirdPlaced(allGroupResults(0, 0))
    expect(ranked).not.toBeNull()
    expect(ranked!).toHaveLength(12)
  })

  it('includes exactly one team from every group', () => {
    const ranked = rankThirdPlaced(allGroupResults(0, 0))
    expect(ranked).not.toBeNull()
    const groups = ranked!.map((s) => s.team.group)
    expect(new Set(groups).size).toBe(12)
    for (const gid of GROUP_IDS) {
      expect(groups).toContain(gid)
    }
  })

  it('sorts by points descending', () => {
    // All home wins (1-0) gives each group a specific 3rd-place point total.
    const ranked = rankThirdPlaced(allGroupResults(1, 0))
    expect(ranked).not.toBeNull()
    for (let i = 0; i < ranked!.length - 1; i++) {
      expect(ranked![i]!.points).toBeGreaterThanOrEqual(ranked![i + 1]!.points)
    }
  })

  it('breaks equal points by goal difference descending', () => {
    // All draws → same points for every third-place team.
    const ranked = rankThirdPlaced(allGroupResults(0, 0))
    expect(ranked).not.toBeNull()
    for (let i = 0; i < ranked!.length - 1; i++) {
      if (ranked![i]!.points === ranked![i + 1]!.points) {
        expect(ranked![i]!.goalDiff).toBeGreaterThanOrEqual(ranked![i + 1]!.goalDiff)
      }
    }
  })

  it('places a higher-points team above lower-points teams regardless of group', () => {
    // All home wins (1-0): produces varied points for each group's 3rd-place team.
    // The key property: ranked[0] must have at least as many points as ranked[11].
    const results = allGroupResults(1, 0)
    const ranked = rankThirdPlaced(results)
    expect(ranked).not.toBeNull()
    expect(ranked![0]!.points).toBeGreaterThanOrEqual(ranked![ranked!.length - 1]!.points)
  })
})

// ---------------------------------------------------------------------------
// resolveThirdPlaceSlot
// ---------------------------------------------------------------------------

describe('resolveThirdPlaceSlot', () => {
  it('returns null when group stage is incomplete', () => {
    expect(resolveThirdPlaceSlot(1, {})).toBeNull()
  })

  it('returns a Team for each slot when all groups are complete', () => {
    const results = allGroupResults(1, 0)
    for (const slot of [1, 2, 3, 4, 5, 6, 7, 8] as const) {
      const team = resolveThirdPlaceSlot(slot, results)
      expect(team).not.toBeNull()
      expect(typeof team!.id).toBe('string')
    }
  })

  it('fills each slot with a distinct team', () => {
    const results = allGroupResults(1, 0)
    const teams = ([1, 2, 3, 4, 5, 6, 7, 8] as const).map((slot) =>
      resolveThirdPlaceSlot(slot, results),
    )
    const ids = teams.map((t) => t!.id)
    expect(new Set(ids).size).toBe(8)
  })

  it('all 8 slot teams come from the top-8 qualifying groups', () => {
    const results = allGroupResults(1, 0)
    const ranked = rankThirdPlaced(results)!
    const top8Groups = new Set(ranked.slice(0, 8).map((s) => s.team.group))
    for (const slot of [1, 2, 3, 4, 5, 6, 7, 8] as const) {
      const team = resolveThirdPlaceSlot(slot, results)
      expect(top8Groups.has(team!.group)).toBe(true)
    }
  })
})
