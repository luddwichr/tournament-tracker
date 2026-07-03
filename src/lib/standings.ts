import type { GroupId, Result, Team } from '../types/tournament'
import { teamsInGroup } from '../data/teams'
import { groupMatches } from '../data/fixtures-2026'
import { sortTeams } from './tiebreakers'

export function isGroupComplete(groupId: GroupId, results: Record<string, Result>): boolean {
  return groupMatches.filter((m) => m.group === groupId).every((m) => results[m.id] != null)
}

export type MatchOutcome = 'W' | 'D' | 'L'

export interface TeamStat {
  team: Team
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDiff: number
  points: number
  yellowCards: number
  redCards: number
  /** -1 × yellow - 3 × red across all group matches; higher (less negative) = better. */
  fairPlayScore: number
  /** Match outcomes in chronological order (up to 3). */
  form: MatchOutcome[]
}

// ---------------------------------------------------------------------------
// Fingerprint — a string key built from a group's match results (including
// discipline counts). Shared by the memoization below and by
// possible-teams.ts, which keys its own cache on (group, rank, fingerprint).
// ---------------------------------------------------------------------------

export function resultFingerprint(groupId: GroupId, results: Record<string, Result>): string {
  return groupMatches
    .filter((m) => m.group === groupId)
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
// Memoization — keyed by (groupId, result fingerprint). Without this, a
// single score entry can trigger dozens of redundant recomputations: every
// GroupTable/OriginColumn instance, the third-place ranking, and every
// bracket TeamRef resolution each call computeGroupStandings independently.
// ---------------------------------------------------------------------------

const MAX_CACHE_SIZE = 200
const standingsCache = new Map<string, TeamStat[]>()

/** Clear the memoization cache — call after resetting or importing results. */
export function clearStandingsCache(): void {
  standingsCache.clear()
}

/**
 * Compute the sorted group standings for `groupId` given the current `results`
 * map. Teams with no results played appear last, ordered by FIFA ranking.
 * Memoized per (groupId, results fingerprint) — see `resultFingerprint`.
 */
export function computeGroupStandings(groupId: GroupId, results: Record<string, Result>): TeamStat[] {
  const cacheKey = `${groupId}:${resultFingerprint(groupId, results)}`
  const cached = standingsCache.get(cacheKey)
  if (cached) return cached

  const computed = computeGroupStandingsUncached(groupId, results)
  if (standingsCache.size >= MAX_CACHE_SIZE) standingsCache.clear()
  standingsCache.set(cacheKey, computed)
  return computed
}

function computeGroupStandingsUncached(groupId: GroupId, results: Record<string, Result>): TeamStat[] {
  const gTeams = teamsInGroup(groupId)
  const gMatches = groupMatches.filter((m) => m.group === groupId)

  const statsMap = new Map<string, TeamStat>(
    gTeams.map((team) => [
      team.id,
      {
        team,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0,
        yellowCards: 0,
        redCards: 0,
        fairPlayScore: 0,
        form: [],
      },
    ]),
  )

  for (const match of gMatches) {
    const result = results[match.id]
    if (!result) continue
    if (match.homeRef.kind !== 'team' || match.awayRef.kind !== 'team') continue

    const home = statsMap.get(match.homeRef.teamId)
    const away = statsMap.get(match.awayRef.teamId)
    if (!home || !away) continue

    home.played++
    away.played++

    home.goalsFor += result.homeGoals
    home.goalsAgainst += result.awayGoals
    away.goalsFor += result.awayGoals
    away.goalsAgainst += result.homeGoals

    home.yellowCards += result.homeYellow
    home.redCards += result.homeRed
    away.yellowCards += result.awayYellow
    away.redCards += result.awayRed

    if (result.homeGoals > result.awayGoals) {
      home.wins++
      home.points += 3
      home.form.push('W')
      away.losses++
      away.form.push('L')
    } else if (result.homeGoals < result.awayGoals) {
      away.wins++
      away.points += 3
      away.form.push('W')
      home.losses++
      home.form.push('L')
    } else {
      home.draws++
      home.points++
      home.form.push('D')
      away.draws++
      away.points++
      away.form.push('D')
    }
  }

  for (const stat of statsMap.values()) {
    stat.goalDiff = stat.goalsFor - stat.goalsAgainst
    stat.fairPlayScore = -stat.yellowCards - 3 * stat.redCards
  }

  const sorted = sortTeams(gTeams, gMatches, results, statsMap)
  return sorted.flatMap((team) => {
    const s = statsMap.get(team.id)
    return s ? [s] : []
  })
}
