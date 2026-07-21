import type { Ref } from 'vue'

// The card element a connector line attaches to, or the wrapper itself when the card isn't there.
// `MatchCard` marks it with `data-connector-anchor` so this stays independent of the component's scoped class names.
function connectorAnchor(group: HTMLElement): HTMLElement {
  return group.querySelector<HTMLElement>('[data-connector-anchor]') ?? group
}

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

export function useBracketConnectors(roundsEl: Ref<HTMLElement | null>) {
  function matchConnector(fromId: string, toId: string): string | null {
    if (!roundsEl.value) return null
    const container = roundsEl.value
    const fromGroup = container.querySelector<HTMLElement>(`[data-match-id="${fromId}"]`)
    const toGroup = container.querySelector<HTMLElement>(`[data-match-id="${toId}"]`)
    if (!fromGroup || !toGroup) return null
    return connectorBetween(connectorAnchor(fromGroup), connectorAnchor(toGroup), container)
  }

  function originConnector(refKey: string, matchId: string): string | null {
    if (!roundsEl.value) return null
    const container = roundsEl.value
    const fromEl = container.querySelector<HTMLElement>(`[data-ref-key="${refKey}"]`)
    const toGroup = container.querySelector<HTMLElement>(`[data-match-id="${matchId}"]`)
    if (!fromEl || !toGroup) return null
    return connectorBetween(fromEl, connectorAnchor(toGroup), container)
  }

  return { matchConnector, originConnector }
}
