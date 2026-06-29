/**
 * Enumerate the set of teams that could still fill an unresolved TeamRef
 * given current results.
 *
 * groupRank: iterates plausible score combos for remaining group matches and
 * collects every team that can achieve the target rank in at least one scenario.
 * Score range is adaptive — wider when few matches remain (0..6 per side for
 * ≤3 remaining; 0..2 for all 6 remaining) — so worst-case combos are ≤531k.
 * Stops early once all group teams have been found at the target rank.
 * Results are memoized per (group, rank, played-result fingerprint).
 *
 * thirdPlace: approximation via the Annex C allocation table — collects all
 * groups that could be the source group for the given slot and returns teams
 * that could finish 3rd in any of those groups. Does not verify that a
 * candidate actually makes the top-8 cut; the slight over-approximation is
 * acceptable for this informational feature.
 *
 * matchWinner / matchLoser: when the match is already played, delegates to
 * resolveTeamRef for an exact answer; when unplayed, returns the union of
 * possible home and away teams (either could win or lose).
 */

import type { Team, TeamRef, GroupId, Result, ThirdPlaceSlot } from '../types/tournament'
import { groupMatches, knockoutMatches, THIRD_PLACE_ALLOCATION, THIRD_PLACE_SLOT_HOST } from '../data/fixtures-2026'
import { teamsById, teamsInGroup } from '../data/teams'
import { computeGroupStandings } from './standings'
import { resolveTeamRef } from './knockout'
import { resolveThirdPlaceSlot } from './third-place'

// ---------------------------------------------------------------------------
// Adaptive score range — fewer remaining matches → wider range → more precise
// ---------------------------------------------------------------------------

// Base caps per remaining-match count; gdSpread lifts them so a team can
// always overcome the worst current GD deficit in the simulated scenarios.
function maxGoalsPerSide(remainingCount: number, gdSpread: number): number {
  const base = remainingCount <= 3 ? 7 : remainingCount <= 5 ? 4 : 3
  return Math.max(base, gdSpread + 1)
}

// ---------------------------------------------------------------------------
// Memoization — keyed by (group, rank, result fingerprint)
// ---------------------------------------------------------------------------

const MAX_CACHE_SIZE = 500
const cache = new Map<string, Set<string>>()

/** Clear the memoization cache — call after resetting or importing results. */
export function clearPossibleTeamsCache(): void {
  cache.clear()
}

function groupResultFingerprint(group: GroupId, results: Record<string, Result>): string {
  return groupMatches
    .filter((m) => m.group === group)
    .map((m) => {
      const r = results[m.id]
      // Include discipline counts: fair-play (yellow/red cards) breaks ties and
      // must be part of the cache key, otherwise two identical-score results with
      // different cards would collide and return a stale cached set.
      return r ? `${r.homeGoals}:${r.awayGoals}:${r.homeYellow}:${r.homeRed}:${r.awayYellow}:${r.awayRed}` : '_'
    })
    .join(',')
}

// ---------------------------------------------------------------------------
// Core: possible teams at a specific group rank
// ---------------------------------------------------------------------------

function possibleGroupRankTeamIds(group: GroupId, rank: 1 | 2 | 3, results: Record<string, Result>): Set<string> {
  const fp = groupResultFingerprint(group, results)
  const cacheKey = `${group}:${rank}:${fp}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const gMatches = groupMatches.filter((m) => m.group === group)
  const remaining = gMatches.filter((m) => !results[m.id])
  const groupTeamCount = teamsInGroup(group).length
  const possible = new Set<string>()

  if (remaining.length === 0) {
    const standings = computeGroupStandings(group, results)
    const t = standings[rank - 1]?.team
    if (t) possible.add(t.id)
  } else {
    // Compute GD spread from played results so the cap covers any deficit a
    // team needs to overcome; avoids silently under-approximating large swings.
    const gdByTeam = new Map<string, number>()
    for (const m of gMatches) {
      const r = results[m.id]
      if (!r || m.homeRef.kind !== 'team' || m.awayRef.kind !== 'team') continue
      const diff = r.homeGoals - r.awayGoals
      gdByTeam.set(m.homeRef.teamId, (gdByTeam.get(m.homeRef.teamId) ?? 0) + diff)
      gdByTeam.set(m.awayRef.teamId, (gdByTeam.get(m.awayRef.teamId) ?? 0) - diff)
    }
    const gds = [...gdByTeam.values()]
    const gdSpread = gds.length >= 2 ? Math.max(...gds) - Math.min(...gds) : 0
    const maxGoals = maxGoalsPerSide(remaining.length, gdSpread)
    const partial: Record<string, Result> = { ...results }

    const enumerate = (i: number) => {
      if (possible.size >= groupTeamCount) return // all teams found — short-circuit
      if (i === remaining.length) {
        const standings = computeGroupStandings(group, partial)
        const t = standings[rank - 1]?.team
        if (t) possible.add(t.id)
        return
      }
      const match = remaining[i]!
      for (let h = 0; h < maxGoals; h++) {
        for (let a = 0; a < maxGoals; a++) {
          partial[match.id] = {
            matchId: match.id,
            homeGoals: h,
            awayGoals: a,
            homeYellow: 0,
            homeRed: 0,
            awayYellow: 0,
            awayRed: 0,
          }
          enumerate(i + 1)
          if (possible.size >= groupTeamCount) {
            delete partial[match.id]
            return
          }
        }
      }
      delete partial[match.id]
    }

    enumerate(0)
  }

  if (cache.size >= MAX_CACHE_SIZE) cache.clear()
  cache.set(cacheKey, possible)
  return possible
}

// ---------------------------------------------------------------------------
// thirdPlace — approximation via Annex C allocation table
// ---------------------------------------------------------------------------

function possibleSourceGroupsForSlot(slot: ThirdPlaceSlot): Set<GroupId> {
  const hostGroup = THIRD_PLACE_SLOT_HOST[slot]
  const groups = new Set<GroupId>()
  for (const alloc of Object.values(THIRD_PLACE_ALLOCATION)) {
    const src = alloc[hostGroup]
    if (src) groups.add(src)
  }
  return groups
}

function possibleThirdPlaceTeamIds(slot: ThirdPlaceSlot, results: Record<string, Result>): Set<string> {
  // When all groups are complete the slot is deterministic — use exact resolution.
  const resolved = resolveThirdPlaceSlot(slot, results)
  if (resolved) return new Set([resolved.id])

  // Some groups still incomplete — approximate via allocation table:
  // collect the rank-3 team from every group that could be the source for this slot.
  const srcGroups = possibleSourceGroupsForSlot(slot)
  const possible = new Set<string>()
  for (const group of srcGroups) {
    for (const id of possibleGroupRankTeamIds(group, 3, results)) {
      possible.add(id)
    }
  }
  return possible
}

// ---------------------------------------------------------------------------
// Internal dispatch
// ---------------------------------------------------------------------------

function possibleTeamIdsFor(ref: TeamRef, results: Record<string, Result>): Set<string> {
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
      const existingResult = results[ref.matchId]
      if (existingResult) {
        // Match already played — exact resolution
        const resolved = resolveTeamRef(ref, results)
        return resolved ? new Set([resolved.id]) : new Set()
      }
      // Match unplayed — either home or away team could win (or lose)
      const match = knockoutMatches.find((m) => m.id === ref.matchId)
      if (!match) return new Set()
      const homeIds = possibleTeamIdsFor(match.homeRef, results)
      const awayIds = possibleTeamIdsFor(match.awayRef, results)
      const union = new Set<string>()
      for (const id of homeIds) union.add(id)
      for (const id of awayIds) union.add(id)
      return union
    }

    default: {
      const _exhaustive: never = ref
      throw new Error(`Unhandled TeamRef kind: ${JSON.stringify(_exhaustive)}`)
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return the set of teams that could still fill `ref` given `results`.
 * Returns an empty set only for unresolvable refs (bad match id, etc.).
 */
export function possibleTeamsFor(ref: TeamRef, results: Record<string, Result>): Set<Team> {
  const ids = possibleTeamIdsFor(ref, results)
  const teams = new Set<Team>()
  for (const id of ids) {
    const team = teamsById.get(id)
    if (team) teams.add(team)
  }
  return teams
}
