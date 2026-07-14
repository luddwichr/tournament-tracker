import type { GroupId, Result, ResultsMap } from '../types/tournament'
import { STORAGE_KEY, isValidResultsMap } from '../lib/persistence'
import { type TeamStat, clearStandingsCache, computeGroupStandings } from '../lib/standings'
import { computed, ref } from 'vue'
import { invalidatedDownstream, resultsWithout } from '../lib/invalidation'
import { GROUP_IDS } from '../types/tournament'
import { defineStore } from 'pinia'
import { freePossibleTeamsMemory } from '../lib/possible-teams'

export const useTournamentStore = defineStore(
  'tournament',
  () => {
    const results = ref<ResultsMap>({})

    // Computed once and shared across every consumer (GroupTable ×12,
    // OriginColumn, …) instead of once per component instance; Vue only
    // recomputes it when `results` actually changes.
    const standingsByGroup = computed(
      (): Map<GroupId, TeamStat[]> => new Map(GROUP_IDS.map((id) => [id, computeGroupStandings(id, results.value)])),
    )

    // Invariant: the store never keeps a knockout result whose participants
    // no longer match what it was entered for — enterResult/clearResult
    // compute the invalidated set (see invalidation.ts) and drop those
    // entries in the same atomic write, so no caller can forget. The UI is
    // responsible for asking the user first (see use-match-result-form.ts).
    function enterResult(result: Result): void {
      const invalidated = invalidatedDownstream(results.value, result.matchId, result)
      results.value = { ...resultsWithout(results.value, invalidated), [result.matchId]: result }
    }

    function clearResult(matchId: string): void {
      const invalidated = invalidatedDownstream(results.value, matchId, null)
      results.value = resultsWithout(results.value, [matchId, ...invalidated])
    }

    function reset(): void {
      results.value = {}
      freePossibleTeamsMemory()
      clearStandingsCache()
    }

    function importResults(newResults: ResultsMap): void {
      results.value = { ...newResults }
      freePossibleTeamsMemory()
      clearStandingsCache()
    }

    return { clearResult, enterResult, importResults, reset, results, standingsByGroup }
  },
  {
    persist: {
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
      key: STORAGE_KEY,
    },
  },
)
