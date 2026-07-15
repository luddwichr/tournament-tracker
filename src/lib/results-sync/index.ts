// Provider-agnostic glue: maps a provider's `SourceMatch[]` onto match-slot ids.
// Swapping the source means changing `defaultProvider`, nothing else.

import type { FetchResultsOptions, ResultsProvider, SourceMatch } from './provider'
import type { MatchSlot, Result, ResultsMap } from '../../types/tournament'
import { espnProvider } from './providers/espn'
import { fixtures } from '../../data/fixtures-2026'
import { resolveTeamRef } from '../knockout'

export type { ResultsProvider, SourceMatch, FetchResultsOptions } from './provider'

export const defaultProvider: ResultsProvider = espnProvider

/** Order-independent key for the pair of teams in a match. */
function pairKey(a: string, b: string): string {
  return [a, b].toSorted().join('|')
}

/** Index of the candidate whose date sits closest to `kickoff`. */
function nearestIndex(candidates: readonly SourceMatch[], kickoff: string): number {
  if (candidates.length === 1) return 0
  const target = new Date(kickoff).getTime()
  let best = 0
  let bestDiff = Number.POSITIVE_INFINITY
  candidates.forEach((candidate, index) => {
    const diff = Math.abs(new Date(candidate.date).getTime() - target)
    if (diff < bestDiff) {
      bestDiff = diff
      best = index
    }
  })
  return best
}

// Walks `fixtures` in order so each slot's teams resolve from the results
// gathered so far — knockout matchups become known once their feeders land.
// Matches by unordered team pair; a recurring pair (group meeting + knockout
// rematch) picks the candidate nearest the kickoff, consuming each fetched match
// once so it can't be reused.
export function buildResultsFromSource(fetched: readonly SourceMatch[]): ResultsMap {
  const byPair = new Map<string, SourceMatch[]>()
  for (const match of fetched) {
    const key = pairKey(match.homeId, match.awayId)
    const existing = byPair.get(key)
    if (existing) existing.push(match)
    else byPair.set(key, [match])
  }

  const results: Record<string, Result> = {}
  for (const slot of fixtures) {
    const home = resolveTeamRef(slot.homeRef, results)
    const away = resolveTeamRef(slot.awayRef, results)
    if (!home || !away) continue

    const key = pairKey(home.id, away.id)
    const candidates = byPair.get(key)
    if (!candidates || candidates.length === 0) continue

    const index = nearestIndex(candidates, slot.kickoff)
    const source = candidates[index]
    if (!source) continue // unreachable: nearestIndex indexes the non-empty `candidates`
    byPair.set(key, candidates.toSpliced(index, 1))

    const homeFirst = source.homeId === home.id
    results[slot.id] = {
      ...toScore(source, slot, homeFirst),
      awayRed: homeFirst ? source.awayRed : source.homeRed,
      awayYellow: homeFirst ? source.awayYellow : source.homeYellow,
      homeRed: homeFirst ? source.homeRed : source.awayRed,
      homeYellow: homeFirst ? source.homeYellow : source.awayYellow,
      matchId: slot.id,
    }
  }
  return results
}

/**
 * A source match's score in `Result` form, oriented to the slot's home side.
 * Shootout goals are kept as separate fields only when they satisfy the
 * `Result` invariants (knockout slot, level real score, decisive shootout);
 * any other shootout report from the feed is folded into the goals instead —
 * a `Result` violating the invariants would be rejected wholesale at the
 * persistence boundary (`isValidResultsMap`), wiping the user's state on the
 * next app load.
 */
function toScore(
  source: SourceMatch,
  slot: MatchSlot,
  homeFirst: boolean,
): Pick<Result, 'homeGoals' | 'awayGoals' | 'homeShootoutGoals' | 'awayShootoutGoals'> {
  const homeGoals = homeFirst ? source.homeGoals : source.awayGoals
  const awayGoals = homeFirst ? source.awayGoals : source.homeGoals
  const homeShootout = (homeFirst ? source.homeShootoutGoals : source.awayShootoutGoals) ?? 0
  const awayShootout = (homeFirst ? source.awayShootoutGoals : source.homeShootoutGoals) ?? 0

  if (homeShootout === 0 && awayShootout === 0) return { awayGoals, homeGoals }
  if (slot.stage !== 'group' && homeGoals === awayGoals && homeShootout !== awayShootout) {
    return { awayGoals, awayShootoutGoals: awayShootout, homeGoals, homeShootoutGoals: homeShootout }
  }
  return { awayGoals: awayGoals + awayShootout, homeGoals: homeGoals + homeShootout }
}

export async function syncResults(opts?: FetchResultsOptions): Promise<ResultsMap> {
  const fetched = await defaultProvider.fetchResults(opts)
  return buildResultsFromSource(fetched)
}
