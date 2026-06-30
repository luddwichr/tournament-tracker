import type { Ref } from 'vue'
export { nextMatchMap, prevMatchMap, teamRefToMatchId, matchToRefKeys } from '../lib/bracket-graph'

function connectorBetween(fromEl: HTMLElement, toEl: HTMLElement, container: HTMLElement): string {
  const cRect = container.getBoundingClientRect()
  const sR = fromEl.getBoundingClientRect()
  const tR = toEl.getBoundingClientRect()
  const x1 = sR.right - cRect.left
  const y1 = sR.top + sR.height / 2 - cRect.top
  const x2 = tR.left - cRect.left
  const y2 = tR.top + tR.height / 2 - cRect.top
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
    return connectorBetween(fromEl, toEl, container)
  }

  function originConnector(refKey: string, matchId: string): string | null {
    if (!roundsEl.value || !viewEl.value) return null
    const container = roundsEl.value
    const fromEl = container.querySelector<HTMLElement>(`[data-ref-key="${refKey}"]`)
    const toGroup = container.querySelector<HTMLElement>(`[data-match-id="${matchId}"]`)
    if (!fromEl || !toGroup) return null
    const toEl = toGroup.querySelector<HTMLElement>('.match-card') ?? toGroup
    return connectorBetween(fromEl, toEl, container)
  }

  return { matchConnector, originConnector }
}
