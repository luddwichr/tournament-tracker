import type { Result } from '../types/tournament'
import { groupMatches } from '../data/fixtures-2026'

export function makeResult(matchId: string, homeGoals = 1, awayGoals = 0, extra: Partial<Result> = {}): Result {
  return {
    awayGoals,
    awayRed: 0,
    awayYellow: 0,
    homeGoals,
    homeRed: 0,
    homeYellow: 0,
    matchId,
    ...extra,
  }
}

export type CardOverrides = Record<
  string,
  { homeYellow?: number; homeRed?: number; awayYellow?: number; awayRed?: number }
>

/**
 * Build a results map where every group match plays out as the given score,
 * with optional per-matchId score and card overrides.
 */
export function allGroupResults(
  homeGoals = 1,
  awayGoals = 0,
  overrides: Record<string, [number, number]> = {},
  cardOverrides: CardOverrides = {},
): Record<string, Result> {
  const results: Record<string, Result> = {}
  for (const m of groupMatches) {
    const [h, a] = overrides[m.id] ?? [homeGoals, awayGoals]
    results[m.id] = makeResult(m.id, h, a, cardOverrides[m.id] ?? {})
  }
  return results
}

// Test fixtures are mutable on purpose.
// Callers routinely tweak individual entries after building the base map, as knockout.spec.ts does.
export function resultsMap(...results: Result[]): Record<string, Result> {
  return Object.fromEntries(results.map((r) => [r.matchId, r]))
}
