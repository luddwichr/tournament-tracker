/**
 * Third-place ranking for the FIFA 2026 World Cup.
 *
 * After all 12 groups complete, the 12 third-placed teams are ranked using
 * the cross-group tiebreaker chain (no H2H — teams come from different groups):
 *   1. Points, 2. GD, 3. GF, 4. Fair-play, 5. FIFA ranking (deterministic)
 *
 * The top 8 are then mapped to round-of-32 slots via the FIFA Annex C allocation
 * table (THIRD_PLACE_ALLOCATION in fixtures-2026.ts).
 */

import type { Result, Team, ThirdPlaceSlot } from '../types/tournament'
import { GROUP_IDS } from '../types/tournament'
import { THIRD_PLACE_ALLOCATION, THIRD_PLACE_SLOT_HOST } from '../data/fixtures-2026'
import type { TeamStat } from './standings'
import { computeGroupStandings, isGroupComplete } from './standings'
import { compareByPointsGdGf } from './tiebreakers'

function compareThirdPlaced(a: TeamStat, b: TeamStat): number {
  const byPGF = compareByPointsGdGf(a, b)
  if (byPGF !== 0) return byPGF
  if (a.fairPlayScore !== b.fairPlayScore) return b.fairPlayScore - a.fairPlayScore
  return a.team.fifaRanking - b.team.fifaRanking
}

/**
 * Rank all 12 third-placed teams (best → worst) from current results.
 * Returns null if not all 12 groups have complete group-stage results.
 */
export function rankThirdPlaced(results: Record<string, Result>): TeamStat[] | null {
  for (const groupId of GROUP_IDS) {
    if (!isGroupComplete(groupId, results)) return null
  }

  const thirds = GROUP_IDS.map((groupId) => {
    const standings = computeGroupStandings(groupId, results)
    return standings[2]!
  })

  return thirds.toSorted(compareThirdPlaced)
}

/**
 * Resolve the team occupying `slot` (1–8) in the R32 third-place bracket.
 * Returns null if the slot cannot yet be determined.
 */
export function resolveThirdPlaceSlot(slot: ThirdPlaceSlot, results: Record<string, Result>): Team | null {
  const ranked = rankThirdPlaced(results)
  if (!ranked) return null

  const top8 = ranked.slice(0, 8)
  const qualifyingGroups = top8
    .map((stat) => stat.team.group)
    .toSorted()
    .join('')

  const allocation = THIRD_PLACE_ALLOCATION[qualifyingGroups]
  if (!allocation) return null

  const hostGroup = THIRD_PLACE_SLOT_HOST[slot]
  const sourceGroup = allocation[hostGroup]
  if (!sourceGroup) return null

  return top8.find((stat) => stat.team.group === sourceGroup)?.team ?? null
}
