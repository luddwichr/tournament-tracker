import type { GroupId, Result, ResultsMap } from '../types/tournament'
import { STORAGE_KEY, clearLegacyResults, isValidResultsMap, readLegacyResults } from '../lib/persistence'
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

    // Invariant: the store never keeps a knockout result whose participants don't match what it was entered for.
    // enterResult and clearResult compute the invalidated set, see invalidation.ts.
    // They drop those entries in the same atomic write, so no caller can forget.
    // The UI is responsible for asking the user first, see use-match-result-form.ts.
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

    /**
     * Run once after the persistence plugin rehydrates state (from the
     * `afterHydrate` hook below). Validates the rehydrated results and performs
     * the one-shot v1 → v2 migration; returns true when legacy data was adopted
     * so the hook can persist it under the new key. Lives here, in the setup,
     * so it works against the store's own typed state and actions instead of
     * casting the loosely-typed plugin `context.store`.
     *
     * `pinia-plugin-persistedstate`'s automatic rehydration bypasses `parseImport`'s validation entirely.
     * It just JSON.parses whatever is in localStorage and `$patch`es it straight into state.
     * A corrupted entry would otherwise flow into `computeGroupStandings` and friends unvalidated.
     * Such an entry can come from manual devtools editing, a buggy extension, or a stale schema.
     * For example a string where a number was expected silently
     * does `'2' + 3` string concatenation instead of numeric addition), so
     * invalid state falls back to a safe empty state via the same `reset()`.
     */
    function hydrate(): boolean {
      if (!isValidResultsMap(results.value)) reset()

      // One-shot v1 → v2 migration (see persistence.ts): adopt results
      // persisted under the old key when the new key has none yet.
      // The hook persists them under the new key, and only then is the old entry dropped.
      // So a failure in between never loses the data.
      const legacy = readLegacyResults()
      let adopted = false
      if (legacy && Object.keys(results.value).length === 0) {
        importResults(legacy)
        adopted = true
      }
      clearLegacyResults()
      return adopted
    }

    return { clearResult, enterResult, hydrate, importResults, reset, results, standingsByGroup }
  },
  {
    persist: {
      afterHydrate: ({ store }) => {
        // Only this one action needs a typed shape.
        // Everything else it touches lives inside `hydrate` against the store's real types.
        if ((store as unknown as { hydrate: () => boolean }).hydrate()) {
          store.$persist()
        }
      },
      key: STORAGE_KEY,
    },
  },
)
