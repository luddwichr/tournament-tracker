import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Result } from '../types/tournament'
import { SCHEMA_VERSION } from '../lib/persistence'
import { clearPossibleTeamsCache } from '../lib/possible-teams'

export const useTournamentStore = defineStore(
  'tournament',
  () => {
    const results = ref<Record<string, Result>>({})

    function enterResult(result: Result): void {
      results.value[result.matchId] = result
    }

    function clearResult(matchId: string): void {
      delete results.value[matchId]
    }

    function reset(): void {
      results.value = {}
      clearPossibleTeamsCache()
    }

    function importResults(newResults: Record<string, Result>): void {
      results.value = { ...newResults }
      clearPossibleTeamsCache()
    }

    return { results, enterResult, clearResult, reset, importResults }
  },
  {
    persist: {
      key: `wc2026:results:v${SCHEMA_VERSION}`,
    },
  },
)
