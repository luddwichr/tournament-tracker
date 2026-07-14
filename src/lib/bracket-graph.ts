import type { TeamRef } from '../types/tournament'
import { knockoutMatches } from '../data/fixtures-2026'

function r32RefKey(teamRef: TeamRef): string | null {
  if (teamRef.kind === 'groupRank') return `groupRank:${teamRef.group}:${teamRef.rank}`
  if (teamRef.kind === 'thirdPlace') return `thirdPlace:${teamRef.slot}`
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
    const hk = r32RefKey(match.homeRef)
    const ak = r32RefKey(match.awayRef)
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
