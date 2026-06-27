import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Result } from '../types/tournament'

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

    return { results, enterResult, clearResult }
  },
  {
    persist: {
      key: 'wc2026:results:v1',
    },
  },
)
