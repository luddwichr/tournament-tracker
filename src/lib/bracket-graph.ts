import type { GroupId, TeamRef, ThirdPlaceSlot } from '../types/tournament'
import { knockoutMatches } from '../data/fixtures-2026'

/**
 * The bracket ref-key string format, shared by the graph maps here and the
 * origin-column derivation (`use-origin-group-data.ts`). A template-literal
 * type so the two producers can never drift: a wrong format is a compile
 * error, not a silent miss when they meet in the DOM (`data-ref-key`).
 */
export type RefKey = `groupRank:${GroupId}:${1 | 2}` | `thirdPlace:${ThirdPlaceSlot}`

/**
 * The bracket ref-key for a groupRank/thirdPlace ref; null for any other ref
 * kind (matchWinner/matchLoser are never R32 seeds). The single builder both
 * modules call so the key format lives in exactly one place.
 */
export function refKeyFor(ref: TeamRef): RefKey | null {
  if (ref.kind === 'groupRank') return `groupRank:${ref.group}:${ref.rank}`
  if (ref.kind === 'thirdPlace') return `thirdPlace:${ref.slot}`
  return null
}

export const nextMatchMap = (() => {
  const map = new Map<string, string[]>()
  for (const match of knockoutMatches) {
    if (match.homeRef.kind === 'matchWinner' || match.homeRef.kind === 'matchLoser') {
      const ids = map.get(match.homeRef.matchId) ?? []
      ids.push(match.id)
      map.set(match.homeRef.matchId, ids)
    }
    if (match.awayRef.kind === 'matchWinner' || match.awayRef.kind === 'matchLoser') {
      const ids = map.get(match.awayRef.matchId) ?? []
      ids.push(match.id)
      map.set(match.awayRef.matchId, ids)
    }
  }
  return map
})()

export const prevMatchMap = (() => {
  const map = new Map<string, string[]>()
  for (const match of knockoutMatches) {
    const sources: string[] = []
    if (match.homeRef.kind === 'matchWinner' || match.homeRef.kind === 'matchLoser') sources.push(match.homeRef.matchId)
    if (match.awayRef.kind === 'matchWinner' || match.awayRef.kind === 'matchLoser') sources.push(match.awayRef.matchId)
    if (sources.length > 0) map.set(match.id, sources)
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
