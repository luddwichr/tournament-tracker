import type { Result } from '../types/tournament'
import { groupMatches } from '../data/fixtures-2026'

export function makeResult(
  matchId: string,
  homeGoals: number,
  awayGoals: number,
  extra: Partial<Result> = {},
): Result {
  return {
    matchId,
    homeGoals,
    awayGoals,
    homeYellow: 0,
    homeRed: 0,
    awayYellow: 0,
    awayRed: 0,
    ...extra,
  }
}

export function allGroupResults(homeGoals = 1, awayGoals = 0): Record<string, Result> {
  const results: Record<string, Result> = {}
  for (const m of groupMatches) {
    results[m.id] = makeResult(m.id, homeGoals, awayGoals)
  }
  return results
}

export function resultsMap(...results: Result[]): Record<string, Result> {
  return Object.fromEntries(results.map((r) => [r.matchId, r]))
}
