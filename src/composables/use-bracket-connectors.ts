import type { Ref } from 'vue'
import type { TeamRef } from '../types/tournament'
import { knockoutMatches } from '../data/fixtures-2026'

// Built once from static fixture data — never reactive.

function r32RefKey(teamRef: TeamRef): string | null {
  if (teamRef.kind === 'groupRank') return `groupRank:${teamRef.group}:${teamRef.rank}`
  if (teamRef.kind === 'thirdPlace') return `thirdPlace:${teamRef.slot}`
  return null
}

export const nextMatchMap = (() => {
  const map = new Map<string, string>()
  for (const match of knockoutMatches) {
    if (match.homeRef.kind === 'matchWinner') map.set(match.homeRef.matchId, match.id)
    if (match.awayRef.kind === 'matchWinner') map.set(match.awayRef.matchId, match.id)
  }
  return map
})()

export const prevMatchMap = (() => {
  const map = new Map<string, string[]>()
  for (const match of knockoutMatches) {
    const sources: string[] = []
    if (match.homeRef.kind === 'matchWinner') sources.push(match.homeRef.matchId)
    if (match.awayRef.kind === 'matchWinner') sources.push(match.awayRef.matchId)
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

function connectorBetween(
  fromEl: HTMLElement,
  toEl: HTMLElement,
  container: HTMLElement,
  scrollEl: HTMLElement,
): string {
  const cRect = container.getBoundingClientRect()
  const sl = scrollEl.scrollLeft
  const st = scrollEl.scrollTop
  const sR = fromEl.getBoundingClientRect()
  const tR = toEl.getBoundingClientRect()
  const x1 = sR.right - cRect.left + sl
  const y1 = sR.top + sR.height / 2 - cRect.top + st
  const x2 = tR.left - cRect.left + sl
  const y2 = tR.top + tR.height / 2 - cRect.top + st
  const cx = (x1 + x2) / 2
  return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`
}

export function useBracketConnectors(roundsEl: Ref<HTMLElement | null>, viewEl: Ref<HTMLElement | null>) {
  function matchConnector(fromId: string, toId: string): string | null {
    if (!roundsEl.value || !viewEl.value) return null
    const container = roundsEl.value
    const fromGroup = container.querySelector<HTMLElement>(`[data-match-id="${fromId}"]`)
    const toGroup = container.querySelector<HTMLElement>(`[data-match-id="${toId}"]`)
    if (!fromGroup || !toGroup) return null
    const fromEl = fromGroup.querySelector<HTMLElement>('.match-card') ?? fromGroup
    const toEl = toGroup.querySelector<HTMLElement>('.match-card') ?? toGroup
    return connectorBetween(fromEl, toEl, container, viewEl.value)
  }

  function originConnector(refKey: string, matchId: string): string | null {
    if (!roundsEl.value || !viewEl.value) return null
    const container = roundsEl.value
    const fromEl = container.querySelector<HTMLElement>(`[data-ref-key="${refKey}"]`)
    const toGroup = container.querySelector<HTMLElement>(`[data-match-id="${matchId}"]`)
    if (!fromEl || !toGroup) return null
    const toEl = toGroup.querySelector<HTMLElement>('.match-card') ?? toGroup
    return connectorBetween(fromEl, toEl, container, viewEl.value)
  }

  return { matchConnector, originConnector }
}
