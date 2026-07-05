import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { GroupId, Result } from '../types/tournament'
import { GROUP_IDS } from '../types/tournament'
import { STORAGE_KEY, isValidResultsMap } from '../lib/persistence'
import { freePossibleTeamsMemory } from '../lib/possible-teams'
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
      freePossibleTeamsMemory()
      clearStandingsCache()
    }

    function importResults(newResults: Record<string, Result>): void {
      results.value = { ...newResults }
      freePossibleTeamsMemory()
      clearStandingsCache()
    }

    return { results, standingsByGroup, enterResult, clearResult, reset, importResults }
  },
  {
    persist: {
      key: STORAGE_KEY,
      // `pinia-plugin-persistedstate`'s automatic rehydration on app load
      // bypasses `parseImport`'s validation entirely — it just JSON.parses
      // whatever is in localStorage and `$patch`es it straight into state. A
      // corrupted entry (manual devtools editing, a buggy extension, a stale
      // schema from a previous version) would otherwise flow into
      // `computeGroupStandings` and friends unvalidated (e.g. a string where a
      // number was expected silently does `'2' + 3` string concatenation
      // instead of numeric addition). Validate post-hydration state the same
      // way file import is validated, and fall back to a safe empty state —
      // via the same `reset()` used elsewhere — instead of propagating garbage.
      afterHydrate: (context) => {
        const store = context.store as unknown as { results: unknown; reset: () => void }
        if (!isValidResultsMap(store.results)) {
          store.reset()
        }
      },
    },
  },
)
