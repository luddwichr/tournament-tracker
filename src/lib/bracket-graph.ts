import type { GroupId, TeamRef, ThirdPlaceSlot } from '../types/tournament'
import { knockoutMatches } from '../data/fixtures-2026'

/**
 * The bracket ref-key string format, shared by the graph maps here and the origin-column derivation in
 * `use-origin-group-data.ts`.
 * It is a template-literal type so the two producers can never drift.
 * A wrong format is then a compile error rather than a silent miss when they meet in the DOM via `data-ref-key`.
 */
export type RefKey = `groupRank:${GroupId}:${1 | 2}` | `thirdPlace:${ThirdPlaceSlot}`

/**
 * The bracket ref-key for a groupRank or thirdPlace ref, and null for any other ref kind.
 * matchWinner and matchLoser are never R32 seeds.
 * This is the single builder both modules call, so the key format lives in exactly one place.
 */
export function refKeyFor(ref: TeamRef): RefKey | null {
  if (ref.kind === 'groupRank') return `groupRank:${ref.group}:${ref.rank}`
  if (ref.kind === 'thirdPlace') return `thirdPlace:${ref.slot}`
  return null
}

/**
 * The match a ref feeds from, meaning its winner or loser.
 * Returns null when the ref is not a match outcome, so for a group rank, third place or concrete team.
 */
function feederMatchId(ref: TeamRef): string | null {
  return ref.kind === 'matchWinner' || ref.kind === 'matchLoser' ? ref.matchId : null
}

// Each knockout match → the up-to-two earlier matches that feed it.
export const prevMatchMap = (() => {
  const map = new Map<string, string[]>()
  for (const match of knockoutMatches) {
    const sources: string[] = []
    for (const ref of [match.homeRef, match.awayRef]) {
      const feeder = feederMatchId(ref)
      if (feeder !== null) sources.push(feeder)
    }
    if (sources.length > 0) map.set(match.id, sources)
  }
  return map
})()

// The exact inverse of prevMatchMap, mapping each match to the later matches it feeds.
export const nextMatchMap = (() => {
  const map = new Map<string, string[]>()
  for (const [matchId, feeders] of prevMatchMap) {
    for (const feeder of feeders) {
      const ids = map.get(feeder) ?? []
      ids.push(matchId)
      map.set(feeder, ids)
    }
  }
  return map
})()

export const teamRefToMatchId = (() => {
  const map = new Map<string, string>()
  for (const match of knockoutMatches.filter((m) => m.stage === 'r32')) {
    const hk = refKeyFor(match.homeRef)
    const ak = refKeyFor(match.awayRef)
    if (hk) map.set(hk, match.id)
    if (ak) map.set(ak, match.id)
  }
  return map
})()

export const matchToRefKeys = (() => {
  const map = new Map<string, string[]>()
  for (const [refKey, matchId] of teamRefToMatchId) {
    const keys = map.get(matchId) ?? []
    keys.push(refKey)
    map.set(matchId, keys)
  }
  return map
})()
