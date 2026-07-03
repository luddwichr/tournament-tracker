import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { GroupId, Result } from '../types/tournament'
import { GROUP_IDS } from '../types/tournament'
import { SCHEMA_VERSION } from '../lib/persistence'
import { clearPossibleTeamsCache } from '../lib/possible-teams'
import { computeGroupStandings, clearStandingsCache, type TeamStat } from '../lib/standings'

export const useTournamentStore = defineStore(
  'tournament',
  () => {
    const results = ref<Record<string, Result>>({})

    // Computed once and shared across every consumer (GroupTable ×12,
    // OriginColumn, …) instead of once per component instance; Vue only
    // recomputes it when `results` actually changes.
    const standingsByGroup = computed(
      (): Map<GroupId, TeamStat[]> => new Map(GROUP_IDS.map((id) => [id, computeGroupStandings(id, results.value)])),
    )

    function enterResult(result: Result): void {
      results.value[result.matchId] = result
    }

    function clearResult(matchId: string): void {
      delete results.value[matchId]
    }

    function reset(): void {
      results.value = {}
      clearPossibleTeamsCache()
      clearStandingsCache()
    }

    function importResults(newResults: Record<string, Result>): void {
      results.value = { ...newResults }
      clearPossibleTeamsCache()
      clearStandingsCache()
    }

    return { results, standingsByGroup, enterResult, clearResult, reset, importResults }
  },
  {
    persist: {
      key: `wc2026:results:v${SCHEMA_VERSION}`,
    },
  },
)
