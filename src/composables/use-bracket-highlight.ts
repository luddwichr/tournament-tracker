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
  const connectorPaths = ref<string[]>([])

  const highlightedMatchIds = computed((): string[] => {
    const ids: string[] = []
    if (hoveredMatchId.value) {
      const target = nextMatchMap.get(hoveredMatchId.value)
      if (target) ids.push(target)
      ids.push(...(prevMatchMap.get(hoveredMatchId.value) ?? []))
    }
    if (hoveredRefKey.value) {
      const matchId = teamRefToMatchId.get(hoveredRefKey.value)
      if (matchId) ids.push(matchId)
    }
    return ids
  })

  const highlightedRefKeys = computed((): string[] => {
    const keys: string[] = []
    if (hoveredMatchId.value) {
      keys.push(...(matchToRefKeys.get(hoveredMatchId.value) ?? []))
    }
    if (hoveredRefKey.value) {
      keys.push(hoveredRefKey.value)
    }
    return keys
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
    connectorPaths.value = buildAllPaths(matchId)
  }

  function onMatchHoverEnd(): void {
    hoveredMatchId.value = null
    hoveredRefKey.value = null
    connectorPaths.value = []
  }

  function onTeamRefHover(refKey: string): void {
    hoveredRefKey.value = refKey
    hoveredMatchId.value = null
    const matchId = teamRefToMatchId.get(refKey)
    connectorPaths.value = matchId ? ([originConnector(refKey, matchId)].filter(Boolean) as string[]) : []
  }

  function onTeamRefHoverEnd(): void {
    hoveredRefKey.value = null
    hoveredMatchId.value = null
    connectorPaths.value = []
  }

  return {
    connectorPaths,
    highlightedMatchIds,
    highlightedRefKeys,
    onMatchHover,
    onMatchHoverEnd,
    onTeamRefHover,
    onTeamRefHoverEnd,
  }
}
