/**
 * Full FIFA 2026 group-stage tiebreaker chain.
 *
 * Chain (in order):
 *  1. Points (all matches)
 *  2. Goal difference (all matches)
 *  3. Goals scored (all matches)
 *  4–6. Repeat 1–3 using only head-to-head matches between tied teams
 *  7. Fair-play points: -1 × yellow - 3 × red (all matches; higher = better)
 *  8. FIFA World Ranking (lower position = better; always resolves)
 *
 * See docs/tournament-rules.md and docs/tiebreakers.md for the regulatory source.
 */

import type { Team, MatchSlot, Result } from '../types/tournament'

/** Minimum stat shape required by sortTeams. Covers all tiebreaker criteria. */
export interface TiebreakerStat {
  points: number
  goalDiff: number
  goalsFor: number
  fairPlayScore: number
}

interface H2HStat {
  points: number
  goalDiff: number
  goalsFor: number
}

function h2hMatchesBetween(teams: readonly Team[], matches: readonly MatchSlot[]): MatchSlot[] {
  const ids = new Set(teams.map((t) => t.id))
  return matches.filter(
    (m) =>
      m.homeRef.kind === 'team' &&
      m.awayRef.kind === 'team' &&
      ids.has(m.homeRef.teamId) &&
      ids.has(m.awayRef.teamId),
  )
}

function computeH2HStats(
  teams: readonly Team[],
  h2hMatches: readonly MatchSlot[],
  results: Record<string, Result>,
): Map<string, H2HStat> {
  const map = new Map<string, H2HStat>(
    teams.map((t) => [t.id, { points: 0, goalDiff: 0, goalsFor: 0 }]),
  )

  for (const match of h2hMatches) {
    const result = results[match.id]
    if (!result) continue
    if (match.homeRef.kind !== 'team' || match.awayRef.kind !== 'team') continue

    const home = map.get(match.homeRef.teamId)
    const away = map.get(match.awayRef.teamId)
    if (!home || !away) continue

    home.goalsFor += result.homeGoals
    away.goalsFor += result.awayGoals
    const diff = result.homeGoals - result.awayGoals
    home.goalDiff += diff
    away.goalDiff -= diff

    if (result.homeGoals > result.awayGoals) {
      home.points += 3
    } else if (result.homeGoals < result.awayGoals) {
      away.points += 3
    } else {
      home.points += 1
      away.points += 1
    }
  }

  return map
}

function clusterByH2H(teams: Team[], h2hStats: Map<string, H2HStat>): Team[][] {
  const sorted = [...teams].sort((a, b) => {
    const sa = h2hStats.get(a.id)!
    const sb = h2hStats.get(b.id)!
    if (sb.points !== sa.points) return sb.points - sa.points
    if (sb.goalDiff !== sa.goalDiff) return sb.goalDiff - sa.goalDiff
    if (sb.goalsFor !== sa.goalsFor) return sb.goalsFor - sa.goalsFor
    return 0
  })

  const clusters: Team[][] = []
  let current: Team[] = []
  for (const team of sorted) {
    if (!current.length) {
      current.push(team)
      continue
    }
    // current is non-empty (checked above), so this is always defined.
    const prev = current[current.length - 1]!
    const sp = h2hStats.get(prev.id)!
    const st = h2hStats.get(team.id)!
    if (sp.points === st.points && sp.goalDiff === st.goalDiff && sp.goalsFor === st.goalsFor) {
      current.push(team)
    } else {
      clusters.push(current)
      current = [team]
    }
  }
  if (current.length) clusters.push(current)
  return clusters
}

/**
 * Recursively resolve a tied group of teams using H2H criteria.
 * Falls through to fair-play then FIFA ranking when H2H makes no progress.
 */
function resolveH2H<S extends TiebreakerStat>(
  teams: Team[],
  allGroupMatches: readonly MatchSlot[],
  results: Record<string, Result>,
  overallStats: Map<string, S>,
): Team[] {
  const h2hMatches = h2hMatchesBetween(teams, allGroupMatches)
  const h2hStats = computeH2HStats(teams, h2hMatches, results)
  const clusters = clusterByH2H(teams, h2hStats)

  return clusters.flatMap((cluster) => {
    if (cluster.length === 1) return cluster

    if (cluster.length < teams.length) {
      // H2H narrowed the tie — recurse on the smaller subset.
      return resolveH2H(cluster, allGroupMatches, results, overallStats)
    }

    // H2H made no progress — apply fair-play then FIFA ranking.
    return [...cluster].sort((a, b) => {
      const fpA = overallStats.get(a.id)!.fairPlayScore
      const fpB = overallStats.get(b.id)!.fairPlayScore
      if (fpA !== fpB) return fpB - fpA // higher (less negative) = better
      return a.fifaRanking - b.fifaRanking // lower rank number = better
    })
  })
}

/**
 * Sort `teams` into final group-stage ranking order using the full FIFA
 * tiebreaker chain. `overallStats` must be computed from ALL group matches.
 *
 * The generic `S extends TiebreakerStat` lets callers pass a richer stat map
 * (e.g. `TeamStat` from standings.ts) without unsafe casts.
 */
export function sortTeams<S extends TiebreakerStat>(
  teams: readonly Team[],
  allGroupMatches: readonly MatchSlot[],
  results: Record<string, Result>,
  overallStats: Map<string, S>,
): Team[] {
  const byOverall = [...teams].sort((a, b) => {
    const sa = overallStats.get(a.id)!
    const sb = overallStats.get(b.id)!
    if (sb.points !== sa.points) return sb.points - sa.points
    if (sb.goalDiff !== sa.goalDiff) return sb.goalDiff - sa.goalDiff
    if (sb.goalsFor !== sa.goalsFor) return sb.goalsFor - sa.goalsFor
    return 0
  })

  const overallClusters: Team[][] = []
  let current: Team[] = []
  for (const team of byOverall) {
    if (!current.length) {
      current.push(team)
      continue
    }
    // current is non-empty (checked above), so this is always defined.
    const prev = current[current.length - 1]!
    const sp = overallStats.get(prev.id)!
    const st = overallStats.get(team.id)!
    if (sp.points === st.points && sp.goalDiff === st.goalDiff && sp.goalsFor === st.goalsFor) {
      current.push(team)
    } else {
      overallClusters.push(current)
      current = [team]
    }
  }
  if (current.length) overallClusters.push(current)

  return overallClusters.flatMap((cluster) => {
    if (cluster.length === 1) return cluster
    return resolveH2H(cluster, allGroupMatches, results, overallStats)
  })
}
