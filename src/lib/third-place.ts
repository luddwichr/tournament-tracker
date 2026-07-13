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

import type { GroupId, ResultsMap, Team, ThirdPlaceSlot } from '../types/tournament'
import { GROUP_IDS, toThirdPlaceKey } from '../types/tournament'
import { THIRD_PLACE_ALLOCATION, THIRD_PLACE_SLOT_HOST } from '../data/fixtures-2026'
import type { TeamStat } from './standings'
import { computeGroupStandings, isGroupStageComplete } from './standings'
import { compareByPointsGdGf } from './tiebreakers'

// 0-indexed position of the third-placed team in sorted group standings.
const THIRD_PLACE_RANK = 2
// FIFA Annex C: exactly 8 of the 12 third-placed teams advance to the R32.
export const QUALIFYING_THIRDS_COUNT = 8

function compareThirdPlaced(a: TeamStat, b: TeamStat): number {
  const byPGF = compareByPointsGdGf(a, b)
  if (byPGF !== 0) return byPGF
  if (a.fairPlayScore !== b.fairPlayScore) return b.fairPlayScore - a.fairPlayScore
  return a.team.fifaRanking - b.team.fifaRanking
}

function thirdPlacedStats(results: ResultsMap): TeamStat[] {
  return GROUP_IDS.map((groupId) => {
    const standings = computeGroupStandings(groupId, results)
    const third = standings.at(THIRD_PLACE_RANK)
    if (!third) throw new Error(`Group ${groupId} has fewer than ${THIRD_PLACE_RANK + 1} teams`)
    return third
  })
}

export interface ThirdPlaceRanking {
  /** All 12 third-placed teams, best → worst by the cross-group chain. */
  ranked: TeamStat[]
  /** True once all 12 groups have complete group-stage results. */
  final: boolean
}

/**
 * Rank the 12 third-placed teams (best → worst) from the *current* results,
 * regardless of whether the group stage is finished. Use this for a live
 * "who currently qualifies" view; `final` tells the caller whether the order
 * is still provisional.
 */
export function rankThirdPlacedLive(results: ResultsMap): ThirdPlaceRanking {
  const final = isGroupStageComplete(results)
  return { ranked: thirdPlacedStats(results).toSorted(compareThirdPlaced), final }
}

/**
 * Rank all 12 third-placed teams (best → worst) from current results.
 * Returns null if not all 12 groups have complete group-stage results.
 */
export function rankThirdPlaced(results: ResultsMap): TeamStat[] | null {
  const { ranked, final } = rankThirdPlacedLive(results)
  return final ? ranked : null
}

/**
 * The shared Annex-C walk: from the ranked third-placed teams' top 8, resolve
 * the qualifying-groups allocation key and build the qualifying-group → its
 * assigned ThirdPlaceSlot map. Both `buildGroupToThirdPlaceSlotMap` and
 * `resolveThirdPlaceSlot` are defined in terms of this so there is only one
 * place that walks `THIRD_PLACE_SLOT_HOST`/`THIRD_PLACE_ALLOCATION`.
 *
 * Returns null if the allocation key is not found (should not happen with
 * valid ranked input but guards against unknown combinations).
 */
function qualifyingAllocation(ranked: TeamStat[]): Map<GroupId, ThirdPlaceSlot> | null {
  const top8 = ranked.slice(0, QUALIFYING_THIRDS_COUNT)
  const qualifyingGroups = toThirdPlaceKey(top8.map((s) => s.team.group))
  const allocation = THIRD_PLACE_ALLOCATION[qualifyingGroups]
  if (!allocation) return null

  const map = new Map<GroupId, ThirdPlaceSlot>()
  for (const [slotStr, hostGroup] of Object.entries(THIRD_PLACE_SLOT_HOST)) {
    const slot = Number(slotStr) as ThirdPlaceSlot
    map.set(allocation[hostGroup], slot)
  }
  return map
}

/**
 * Build a map from each qualifying group → its assigned ThirdPlaceSlot.
 * Returns an empty map if the allocation key is not found (should not happen
 * with valid ranked input but guards against unknown combinations).
 */
export function buildGroupToThirdPlaceSlotMap(ranked: TeamStat[]): Map<GroupId, ThirdPlaceSlot> {
  return qualifyingAllocation(ranked) ?? new Map<GroupId, ThirdPlaceSlot>()
}

/**
 * Resolve the team occupying `slot` (1–8) in the R32 third-place bracket.
 * Returns null if the slot cannot yet be determined.
 */
export function resolveThirdPlaceSlot(slot: ThirdPlaceSlot, results: ResultsMap): Team | null {
  const ranked = rankThirdPlaced(results)
  if (!ranked) return null

  const map = qualifyingAllocation(ranked)
  if (!map) return null

  // 8-entry map — a linear scan for the group assigned to `slot` is negligible.
  const sourceGroup = [...map].find(([, s]) => s === slot)?.[0]
  if (!sourceGroup) return null

  const top8 = ranked.slice(0, QUALIFYING_THIRDS_COUNT)
  return top8.find((stat) => stat.team.group === sourceGroup)?.team ?? null
}
