/**
 * Enumerate the set of teams that could still fill an unresolved TeamRef given current results.
 *
 * GroupRank: iterates plausible score combos for remaining group matches.
 * It collects every team that can achieve the target rank in at least one scenario.
 * The score range is adaptive, and it widens when few matches remain.
 * That means 0..6 goals per side for ≤3 remaining matches, and 0..2 when all 6 remain.
 * The range is then clamped so the total number of enumerated (h, a) combinations across all remaining matches never
 * exceeds MAX_ENUMERATION_COMBOS (see below).
 * That clamp holds however large a single lopsided result makes the goal-difference spread.
 * Enumeration stops early once all group teams have been found at the target rank.
 * Results are memoized per (group, rank, played-result fingerprint).
 *
 * ThirdPlace: approximates the answer via the Annex C allocation table.
 * It collects all groups that could be the source group for the given slot.
 * It then returns the teams that could finish 3rd in any of those groups.
 * It does not verify that a candidate actually makes the top-8 cut.
 * The slight over-approximation is acceptable for this informational feature.
 *
 * MatchWinner / matchLoser: when the match is already played, this delegates to resolveTeamRef for an exact answer.
 * When the match is unplayed, it returns the union of possible home and away teams, since either could win or lose.
 */

import type { GroupId, Result, ResultsMap, Team, TeamRef, ThirdPlaceSlot } from '../types/tournament'
import { THIRD_PLACE_ALLOCATION, THIRD_PLACE_SLOT_HOST, fixturesById, groupMatchesByGroup } from '../data/fixtures-2026'
import { computeGroupStandings, resultFingerprint } from './standings'
import { teamsById, teamsInGroup } from '../data/teams'
import { assertNever } from './assert-never'
import { boundedCache } from './bounded-cache'
import { resolveTeamRef } from './knockout'
import { resolveThirdPlaceSlot } from './third-place'

// Adaptive score range: fewer remaining matches mean a wider range and a more precise answer.

// Base caps per remaining-match count.
// gdSpread lifts them so a team can always overcome the worst current GD deficit in the simulated scenarios.
function maxGoalsPerSide(remainingCount: number, gdSpread: number): number {
  let base = 3
  if (remainingCount <= 3) base = 7
  else if (remainingCount <= 5) base = 4
  return Math.max(base, gdSpread + 1)
}

// Total (h, a) combinations explored across all remaining matches is (maxGoals^2) ^ remainingCount.
// `computeGroupStandings` is a cheap, synchronous, allocation-light function.
// A browser can run on the order of 1e6 calls of it without a perceptible main-thread stall.
// The gdSpread lift in `maxGoalsPerSide` is unbounded, because a single lopsided or typo'd score such as 30:0
// inflates it arbitrarily.
// So once several matches remain, the naive cap can blow this budget by many orders of magnitude.
// Clamp it down until the total stays within budget, with a floor at 2 so precision doesn't collapse entirely.
// Small gdSpread or few remaining matches is the common case and never hits this clamp.
// It only kicks in for the pathological combination.
const MAX_ENUMERATION_COMBOS = 1_000_000
const MIN_MAX_GOALS_PER_SIDE = 2

function cappedMaxGoalsPerSide(remainingCount: number, gdSpread: number): number {
  let cap = maxGoalsPerSide(remainingCount, gdSpread)
  while (cap > MIN_MAX_GOALS_PER_SIDE && (cap * cap) ** remainingCount > MAX_ENUMERATION_COMBOS) {
    cap -= 1
  }
  return cap
}

// Memoization, keyed by (group, rank, result fingerprint).

const cache = boundedCache<string, Set<string>>(500)

/**
 * Free the memoization cache's memory.
 * This is called after resetting or importing results.
 *
 * It is not required for correctness.
 * Cache entries are keyed by `(group, rank, result-fingerprint)`, so a stale entry can only ever be returned for
 * identical inputs, which is the correct result rather than staleness.
 * The call is purely memory hygiene, reclaiming eagerly instead of waiting for `MAX_CACHE_SIZE` to be hit.
 * That is why it is named `free...` rather than `clear...Cache`.
 */
export function freePossibleTeamsMemory(): void {
  cache.clear()
}

// Core: possible teams at a specific group rank.

function possibleGroupRankTeamIds(group: GroupId, rank: 1 | 2 | 3, results: ResultsMap): Set<string> {
  const fp = resultFingerprint(group, results)
  const cacheKey = `${group}:${rank}:${fp}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const gMatches = groupMatchesByGroup.get(group) ?? []
  const remaining = gMatches.filter((m) => !results[m.id])
  const groupTeamCount = teamsInGroup(group).length
  const possible = new Set<string>()

  if (remaining.length === 0) {
    const standings = computeGroupStandings(group, results)
    const t = standings[rank - 1]?.team
    if (t) possible.add(t.id)
  } else {
    // Compute GD spread from played results so the cap covers any deficit a team needs to overcome.
    // This avoids silently under-approximating large swings.
    const gdByTeam = new Map<string, number>()
    for (const m of gMatches) {
      const r = results[m.id]
      if (!r) continue
      const diff = r.homeGoals - r.awayGoals
      gdByTeam.set(m.homeRef.teamId, (gdByTeam.get(m.homeRef.teamId) ?? 0) + diff)
      gdByTeam.set(m.awayRef.teamId, (gdByTeam.get(m.awayRef.teamId) ?? 0) - diff)
    }
    const gds = [...gdByTeam.values()]
    const gdSpread = gds.length >= 2 ? Math.max(...gds) - Math.min(...gds) : 0
    const maxGoals = cappedMaxGoalsPerSide(remaining.length, gdSpread)
    // No backtracking cleanup happens between combos.
    // `partial` is only read at the leaf (i === remaining.length), where every remaining match has just been assigned
    // on the current path, overwriting any leftover value.
    const partial: Record<string, Result> = { ...results }

    const enumerate = (i: number) => {
      if (possible.size >= groupTeamCount) return // all teams found, so short-circuit
      if (i === remaining.length) {
        const standings = computeGroupStandings(group, partial)
        const t = standings[rank - 1]?.team
        if (t) possible.add(t.id)
        return
      }
      const match = remaining[i]
      if (!match) return // unreachable: `i === remaining.length` returned above
      for (let h = 0; h < maxGoals; h++) {
        for (let a = 0; a < maxGoals; a++) {
          partial[match.id] = {
            awayGoals: a,
            awayRed: 0,
            awayYellow: 0,
            homeGoals: h,
            homeRed: 0,
            homeYellow: 0,
            matchId: match.id,
          }
          enumerate(i + 1)
          if (possible.size >= groupTeamCount) return
        }
      }
    }

    enumerate(0)
  }

  cache.set(cacheKey, possible)
  return possible
}

// thirdPlace: approximation via the Annex C allocation table.

function possibleSourceGroupsForSlot(slot: ThirdPlaceSlot): Set<GroupId> {
  const hostGroup = THIRD_PLACE_SLOT_HOST[slot]
  const groups = new Set<GroupId>()
  for (const alloc of Object.values(THIRD_PLACE_ALLOCATION)) {
    groups.add(alloc[hostGroup])
  }
  return groups
}

function possibleThirdPlaceTeamIds(slot: ThirdPlaceSlot, results: ResultsMap): Set<string> {
  // When all groups are complete the slot is deterministic, so use exact resolution.
  const resolved = resolveThirdPlaceSlot(slot, results)
  if (resolved) return new Set([resolved.id])

  // Some groups are still incomplete, so approximate via the allocation table.
  // Collect the rank-3 team from every group that could be the source for this slot.
  const srcGroups = possibleSourceGroupsForSlot(slot)
  const possible = new Set<string>()
  for (const group of srcGroups) {
    for (const id of possibleGroupRankTeamIds(group, 3, results)) {
      possible.add(id)
    }
  }
  return possible
}

// Internal dispatch.

function possibleTeamIdsFor(ref: TeamRef, results: ResultsMap): Set<string> {
  switch (ref.kind) {
    case 'team': {
      return teamsById.has(ref.teamId) ? new Set([ref.teamId]) : new Set()
    }

    case 'groupRank': {
      return possibleGroupRankTeamIds(ref.group, ref.rank, results)
    }

    case 'thirdPlace': {
      return possibleThirdPlaceTeamIds(ref.slot, results)
    }

    case 'matchWinner':
    case 'matchLoser': {
      // A decisive score resolves the slot exactly.
      if (results[ref.matchId]) {
        const resolved = resolveTeamRef(ref, results)
        if (resolved) return new Set([resolved.id])
      }
      // Otherwise the match is unplayed, or its score is level without shootout goals, which means "not decided yet".
      // Either way both sides remain possible, so fall through to the union.
      const match = fixturesById.get(ref.matchId)
      if (!match) return new Set()
      const homeIds = possibleTeamIdsFor(match.homeRef, results)
      const awayIds = possibleTeamIdsFor(match.awayRef, results)
      return homeIds.union(awayIds)
    }

    default: {
      return assertNever(ref, 'TeamRef kind')
    }
  }
}

// Public API.

/**
 * Return the teams that could still fill `ref` given `results`.
 * They are already deduplicated by team id inside `possibleTeamIdsFor`, so a plain array suffices.
 * The only caller spreads it straight into a list.
 * Returns an empty array only for unresolvable refs, such as a bad match id.
 */
export function possibleTeamsFor(ref: TeamRef, results: ResultsMap): readonly Team[] {
  const ids = possibleTeamIdsFor(ref, results)
  const teams: Team[] = []
  for (const id of ids) {
    const team = teamsById.get(id)
    if (team) teams.push(team)
  }
  return teams
}
