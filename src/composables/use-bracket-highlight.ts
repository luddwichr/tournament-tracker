import { ref, computed, watch } from 'vue'
import type { Ref } from 'vue'
import { nextMatchMap, prevMatchMap, teamRefToMatchId, matchToRefKeys } from '../lib/bracket-graph'
import { useBracketConnectors } from './use-bracket-connectors'

export function useBracketHighlight(roundsEl: Ref<HTMLElement | null>) {
  const { matchConnector, originConnector } = useBracketConnectors(roundsEl)

  const hoveredMatchId = ref<string | null>(null)
  const hoveredRefKey = ref<string | null>(null)
  // Tap-pinned match (touch devices have no hover): persists until toggled off.
  const pinnedMatchId = ref<string | null>(null)

  // matchConnector/originConnector read DOM geometry (querySelector +
  // getBoundingClientRect), which is invisible to Vue's reactivity system.
  // Bump this whenever roundsEl's box (or its descendants') size changes —
  // window resize, device rotation, late web-font/flag-image loads shifting
  // layout — so connectorPaths below has a reactive dependency to key off.
  const measureVersion = ref(0)
  // jsdom (unit tests) has no ResizeObserver; guard so tests don't crash.
  if (typeof ResizeObserver !== 'undefined') {
    watch(
      roundsEl,
      (el, _oldEl, onCleanup) => {
        if (!el) return
        const observer = new ResizeObserver(() => {
          measureVersion.value++
        })
        observer.observe(el)
        onCleanup(() => observer.disconnect())
      },
      { immediate: true },
    )
  }

  // Hover (desktop) wins while active; otherwise the pinned match drives the highlight.
  const activeMatchId = computed(() => hoveredMatchId.value ?? pinnedMatchId.value)

  const highlightedMatchIds = computed((): string[] => {
    const ids: string[] = []
    if (activeMatchId.value) {
      ids.push(...(nextMatchMap.get(activeMatchId.value) ?? []))
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
    // Dead-looking but load-bearing: DOM geometry isn't reactive, so this
    // read is what makes ResizeObserver-driven layout shifts re-run the computed.
    void measureVersion.value
    if (hoveredRefKey.value) {
      const matchId = teamRefToMatchId.get(hoveredRefKey.value)
      const p = matchId ? originConnector(hoveredRefKey.value, matchId) : null
      return p ? [p] : []
    }
    return activeMatchId.value ? buildAllPaths(activeMatchId.value) : []
  })

  function buildAllPaths(matchId: string): string[] {
    const paths: string[] = []
    for (const targetId of nextMatchMap.get(matchId) ?? []) {
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
