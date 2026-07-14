/**
 * FIFA 2026 group-stage tiebreaker chain (FWC2026 Regulations, Article 13).
 *
 * Teams are first separated by points. Teams level on points are ranked by:
 *
 *  Step 1 — head-to-head among all the tied teams (matches between them only):
 *    a. points, b. goal difference, c. goals scored
 *  Step 2 — for teams still tied, re-apply a–c to the matches among only the
 *    teams that remain tied; if still undecided, apply in order (no restart):
 *    d. overall goal difference, e. overall goals scored, f. fair-play score
 *  Step 3:
 *    g. FIFA World Ranking (lower position = better; always resolves)
 *
 * Note the 2026 reordering: head-to-head (Step 1) is applied BEFORE overall goal
 * difference (Step 2 d). Criterion (g) uses a single stored FIFA ranking — the
 * regulation's "older editions" fallback (h) is never reached, since rankings
 * are unique. Fair-play (f) uses this project's simplified score (see
 * standings.ts). See docs/tournament-rules.md for the regulatory source.
 */

import type { Team, GroupMatchSlot, ResultsMap } from '../types/tournament'

/** Minimum stat shape required by sortTeams. Covers all tiebreaker criteria. */
export interface TiebreakerStat {
  points: number
  goalDiff: number
  goalsFor: number
  fairPlayScore: number
}

interface PointGDGF {
  points: number
  goalDiff: number
  goalsFor: number
}

export function compareByPointsGdGf(a: PointGDGF, b: PointGDGF): number {
  if (b.points !== a.points) return b.points - a.points
  if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff
  return b.goalsFor - a.goalsFor
}

/** Sort `teams` by `compare`, then group runs of teams that compare equal. */
function clusterBy<T>(teams: readonly T[], compare: (a: T, b: T) => number): T[][] {
  const sorted = teams.toSorted(compare)
  const clusters: T[][] = []
  let current: T[] = []
  for (const team of sorted) {
    const prev = current[current.length - 1]
    if (prev === undefined || compare(prev, team) === 0) {
      current.push(team)
    } else {
      clusters.push(current)
      current = [team]
    }
  }
  if (current.length) clusters.push(current)
  return clusters
}

function h2hMatchesBetween(teams: readonly Team[], matches: readonly GroupMatchSlot[]): GroupMatchSlot[] {
  const ids = new Set(teams.map((t) => t.id))
  return matches.filter((m) => ids.has(m.homeRef.teamId) && ids.has(m.awayRef.teamId))
}

function computeH2HStats(
  teams: readonly Team[],
  h2hMatches: readonly GroupMatchSlot[],
  results: ResultsMap,
): Map<string, PointGDGF> {
  const map = new Map<string, PointGDGF>(teams.map((t) => [t.id, { goalDiff: 0, goalsFor: 0, points: 0 }]))

  for (const match of h2hMatches) {
    const result = results[match.id]
    if (!result) continue

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

/**
 * Look up a team's stats, failing loudly on a missing entry. Every lookup
 * below assumes stats exist for every team passed in; returning `undefined`
 * instead would flow into the sort comparators, where `undefined - 5` is
 * `NaN` — which doesn't throw, it just silently mis-orders the group.
 */
function statsFor<S>(stats: Map<string, S>, teamId: string): S {
  const s = stats.get(teamId)
  if (s === undefined) {
    throw new Error(`no stats for team '${teamId}'`)
  }
  return s
}

/**
 * Resolve a set of teams that are level on points (Article 13).
 *
 * Step 1 applies the head-to-head criteria (a–c) among the tied teams. Where
 * that leaves a smaller still-tied subset, Step 2 re-applies a–c to the matches
 * among only those remaining teams (the recursion). When head-to-head makes no
 * further progress, the no-restart sequence d → e → f → g decides the order.
 */
function resolveH2H<S extends TiebreakerStat>(
  teams: Team[],
  allGroupMatches: readonly GroupMatchSlot[],
  results: ResultsMap,
  overallStats: Map<string, S>,
): Team[] {
  const h2hMatches = h2hMatchesBetween(teams, allGroupMatches)
  const h2hStats = computeH2HStats(teams, h2hMatches, results)
  const clusters = clusterBy(teams, (a, b) => compareByPointsGdGf(statsFor(h2hStats, a.id), statsFor(h2hStats, b.id)))

  return clusters.flatMap((cluster) => {
    if (cluster.length === 1) return cluster

    if (cluster.length < teams.length) {
      // Step 2: head-to-head narrowed the tie — re-apply a–c among the remaining teams.
      return resolveH2H(cluster, allGroupMatches, results, overallStats)
    }

    // Head-to-head made no progress — apply overall GD (d), overall goals (e),
    // fair-play (f), then FIFA ranking (g) as a single no-restart sequence.
    return cluster.toSorted((a, b) => {
      const sa = statsFor(overallStats, a.id)
      const sb = statsFor(overallStats, b.id)
      if (sb.goalDiff !== sa.goalDiff) return sb.goalDiff - sa.goalDiff // d
      if (sb.goalsFor !== sa.goalsFor) return sb.goalsFor - sa.goalsFor // e
      if (sb.fairPlayScore !== sa.fairPlayScore) return sb.fairPlayScore - sa.fairPlayScore // f (higher = better)
      return a.fifaRanking - b.fifaRanking // g (lower rank number = better)
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
  allGroupMatches: readonly GroupMatchSlot[],
  results: ResultsMap,
  overallStats: Map<string, S>,
): Team[] {
  // `statsFor` fails loudly on any missing entry, but only for teams a
  // comparator happens to touch — validate the whole precondition up front
  // so the error names the caller's actual mistake.
  for (const team of teams) {
    if (!overallStats.has(team.id)) {
      throw new Error(`sortTeams: no stats for team '${team.id}' in overallStats.`)
    }
  }

  // Teams are first separated by points; only equal-points clusters go through
  // the Article 13 chain (head-to-head before overall goal difference).
  const pointClusters = clusterBy(
    teams,
    (a, b) => statsFor(overallStats, b.id).points - statsFor(overallStats, a.id).points,
  )

  return pointClusters.flatMap((cluster) => {
    if (cluster.length === 1) return cluster
    return resolveH2H(cluster, allGroupMatches, results, overallStats)
  })
}
