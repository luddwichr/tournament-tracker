import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import {
  nextMatchMap,
  prevMatchMap,
  teamRefToMatchId,
  matchToRefKeys,
  useBracketConnectors,
} from './use-bracket-connectors'

export function useBracketHighlight(roundsEl: Ref<HTMLElement | null>, bracketViewEl: Ref<HTMLElement | null>) {
  const { matchConnector, originConnector } = useBracketConnectors(roundsEl, bracketViewEl)

  const hoveredMatchId = ref<string | null>(null)
  const hoveredRefKey = ref<string | null>(null)
  // Tap-pinned match (touch devices have no hover): persists until toggled off.
  const pinnedMatchId = ref<string | null>(null)

  // Hover (desktop) wins while active; otherwise the pinned match drives the highlight.
  const activeMatchId = computed(() => hoveredMatchId.value ?? pinnedMatchId.value)

  const highlightedMatchIds = computed((): string[] => {
    const ids: string[] = []
    if (activeMatchId.value) {
      const target = nextMatchMap.get(activeMatchId.value)
      if (target) ids.push(target)
      ids.push(...(prevMatchMap.get(activeMatchId.value) ?? []))
    }
    if (hoveredRefKey.value) {
      const matchId = teamRefToMatchId.get(hoveredRefKey.value)
      if (matchId) ids.push(matchId)
    }
    return ids
  })

  const highlightedRefKeys = computed((): string[] => {
    const keys: string[] = []
    if (activeMatchId.value) {
      keys.push(...(matchToRefKeys.get(activeMatchId.value) ?? []))
    }
    if (hoveredRefKey.value) {
      keys.push(hoveredRefKey.value)
    }
    return keys
  })

  const connectorPaths = computed((): string[] => {
    if (hoveredRefKey.value) {
      const matchId = teamRefToMatchId.get(hoveredRefKey.value)
      const p = matchId ? originConnector(hoveredRefKey.value, matchId) : null
      return p ? [p] : []
    }
    return activeMatchId.value ? buildAllPaths(activeMatchId.value) : []
  })

  function buildAllPaths(matchId: string): string[] {
    const paths: string[] = []
    const targetId = nextMatchMap.get(matchId)
    if (targetId) {
      const p = matchConnector(matchId, targetId)
      if (p) paths.push(p)
    }
    for (const prevId of prevMatchMap.get(matchId) ?? []) {
      const p = matchConnector(prevId, matchId)
      if (p) paths.push(p)
    }
    for (const refKey of matchToRefKeys.get(matchId) ?? []) {
      const p = originConnector(refKey, matchId)
      if (p) paths.push(p)
    }
    return paths
  }

  function onMatchHover(matchId: string): void {
    hoveredMatchId.value = matchId
    hoveredRefKey.value = null
  }

  function onMatchHoverEnd(): void {
    hoveredMatchId.value = null
    hoveredRefKey.value = null
  }

  function onTeamRefHover(refKey: string): void {
    hoveredRefKey.value = refKey
    hoveredMatchId.value = null
  }

  function onTeamRefHoverEnd(): void {
    hoveredRefKey.value = null
    hoveredMatchId.value = null
  }

  // Tap toggle: pin this match's connections, or unpin if it is already pinned.
  function toggleMatchPin(matchId: string): void {
    pinnedMatchId.value = pinnedMatchId.value === matchId ? null : matchId
  }

  return {
    connectorPaths,
    highlightedMatchIds,
    highlightedRefKeys,
    pinnedMatchId,
    onMatchHover,
    onMatchHoverEnd,
    onTeamRefHover,
    onTeamRefHoverEnd,
    toggleMatchPin,
  }
}
