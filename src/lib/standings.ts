import type { GroupId, ResultsMap, Team } from '../types/tournament'
import { GROUP_IDS } from '../types/tournament'
import { boundedCache } from './bounded-cache'
import { groupMatchesByGroup } from '../data/fixtures-2026'
import { sortTeams } from './tiebreakers'
import { teamsInGroup } from '../data/teams'

export function isGroupComplete(groupId: GroupId, results: ResultsMap): boolean {
  return (groupMatchesByGroup.get(groupId) ?? []).every((m) => results[m.id] != null)
}

/** True once every group has complete group-stage results. */
export function isGroupStageComplete(results: ResultsMap): boolean {
  return GROUP_IDS.every((groupId) => isGroupComplete(groupId, results))
}

type MatchOutcome = 'W' | 'D' | 'L'

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

export function resultFingerprint(groupId: GroupId, results: ResultsMap): string {
  return (groupMatchesByGroup.get(groupId) ?? [])
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

const standingsCache = boundedCache<string, TeamStat[]>(200)

/** Clear the memoization cache — call after resetting or importing results. */
export function clearStandingsCache(): void {
  standingsCache.clear()
}

/**
 * Compute the sorted group standings for `groupId` given the current `results`
 * map. Teams with no results played appear last, ordered by FIFA ranking.
 * Memoized per (groupId, results fingerprint) — see `resultFingerprint`.
 */
export function computeGroupStandings(groupId: GroupId, results: ResultsMap): TeamStat[] {
  const cacheKey = `${groupId}:${resultFingerprint(groupId, results)}`
  const cached = standingsCache.get(cacheKey)
  if (cached) return cached

  const computed = computeGroupStandingsUncached(groupId, results)
  standingsCache.set(cacheKey, computed)
  return computed
}

function computeGroupStandingsUncached(groupId: GroupId, results: ResultsMap): TeamStat[] {
  const gTeams = teamsInGroup(groupId)
  const gMatches = groupMatchesByGroup.get(groupId) ?? []

  const statsMap = new Map<string, TeamStat>(
    gTeams.map((team) => [
      team.id,
      {
        draws: 0,
        fairPlayScore: 0,
        form: [],
        goalDiff: 0,
        goalsAgainst: 0,
        goalsFor: 0,
        losses: 0,
        played: 0,
        points: 0,
        redCards: 0,
        team,
        wins: 0,
        yellowCards: 0,
      },
    ]),
  )

  for (const match of gMatches) {
    const result = results[match.id]
    if (!result) continue

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
