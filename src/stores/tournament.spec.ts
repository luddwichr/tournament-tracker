// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Result } from '../types/tournament'
import { STORAGE_KEY } from '../lib/persistence'
import { allGroupResults } from '../test-support/results'
import { clearStandingsCache } from '../lib/standings'
import { createApp } from 'vue'
import { freePossibleTeamsMemory } from '../lib/possible-teams'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { useTournamentStore } from './tournament'

// Partial-mock: keep every real export (computeGroupStandings, resultFingerprint, …)
// so standingsByGroup still computes correctly, but replace the cache-clearing
// functions with spies so `reset`/`importResults` can be verified without
// depending on cache-internal state.
vi.mock('../lib/possible-teams', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/possible-teams')>()
  return { ...original, freePossibleTeamsMemory: vi.fn() }
})

vi.mock('../lib/standings', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/standings')>()
  return { ...original, clearStandingsCache: vi.fn() }
})

function makeResult(matchId: string, homeGoals = 1, awayGoals = 0): Result {
  return { awayGoals, awayRed: 0, awayYellow: 0, homeGoals, homeRed: 0, homeYellow: 0, matchId }
}

// Pinia only activates plugins queued via `pinia.use(...)` once the pinia
// instance is actually installed into an app (mirrors main.ts's
// `createApp(App).use(pinia)`) — merely calling `setActivePinia` skips that
// step, so the persistedstate plugin would silently never hydrate.
function createPersistedPinia() {
  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)
  createApp({}).use(pinia)
  return pinia
}

describe('tournament store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('enterResult adds a result keyed by matchId', () => {
    const store = useTournamentStore()

    store.enterResult(makeResult('M01', 2, 1))

    expect(store.results['M01']).toEqual(makeResult('M01', 2, 1))
  })

  it('enterResult overwrites an existing result for the same matchId', () => {
    const store = useTournamentStore()

    store.enterResult(makeResult('M01', 2, 1))
    store.enterResult(makeResult('M01', 0, 0))

    expect(store.results['M01']).toEqual(makeResult('M01', 0, 0))
    expect(Object.keys(store.results)).toHaveLength(1)
  })

  it('clearResult removes only the targeted result', () => {
    const store = useTournamentStore()
    store.enterResult(makeResult('M01'))
    store.enterResult(makeResult('M02'))

    store.clearResult('M01')

    expect(store.results['M01']).toBeUndefined()
    expect(store.results['M02']).toBeDefined()
  })

  it('reset clears all results and clears the possible-teams and standings caches', () => {
    const store = useTournamentStore()
    store.enterResult(makeResult('M01'))
    store.enterResult(makeResult('M02'))

    store.reset()

    expect(store.results).toEqual({})
    expect(freePossibleTeamsMemory).toHaveBeenCalledTimes(1)
    expect(clearStandingsCache).toHaveBeenCalledTimes(1)
  })

  it('importResults replaces the whole results map and clears the caches', () => {
    const store = useTournamentStore()
    store.enterResult(makeResult('M01'))

    store.importResults({ M02: makeResult('M02', 3, 3) })

    expect(store.results).toEqual({ M02: makeResult('M02', 3, 3) })
    expect(freePossibleTeamsMemory).toHaveBeenCalledTimes(1)
    expect(clearStandingsCache).toHaveBeenCalledTimes(1)
  })

  it('standingsByGroup recomputes a group when a result affecting it changes', () => {
    const store = useTournamentStore()

    // M01: Mexiko (mex) vs Südafrika (rsa), group A.
    const before = store.standingsByGroup.get('A')?.find((s) => s.team.id === 'mex')
    expect(before?.played).toBe(0)

    store.enterResult(makeResult('M01', 3, 0))

    const after = store.standingsByGroup.get('A')?.find((s) => s.team.id === 'mex')
    expect(after?.played).toBe(1)
    expect(after?.points).toBe(3)
    expect(after?.goalsFor).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// enterResult/clearResult enforce the "no stale downstream knockout result"
// invariant themselves (REVIEW.md §9.1) — see src/lib/invalidation.ts for the
// detection logic and its own spec for the standings math behind these
// specific matches/scores.
// ---------------------------------------------------------------------------

describe('tournament store — invalidation invariant', () => {
  it('enterResult drops invalidated downstream knockout results in the same write', () => {
    const store = useTournamentStore()
    for (const r of Object.values(allGroupResults(1, 0))) store.enterResult(r)
    // M79: R32 slot for Group A's rank-1 team; M92: R16 slot fed by M79's winner.
    store.enterResult(makeResult('M79', 2, 1))
    store.enterResult(makeResult('M92', 1, 0))

    // M53: Tschechien (home) vs Mexiko (away) — flips Group A's rank 1/2.
    store.enterResult(makeResult('M53', 0, 3))

    expect(store.results['M53']).toEqual(makeResult('M53', 0, 3))
    expect(store.results['M79']).toBeUndefined()
    expect(store.results['M92']).toBeUndefined()
  })

  it('enterResult keeps downstream results for a harmless edit', () => {
    const store = useTournamentStore()
    for (const r of Object.values(allGroupResults(1, 0))) store.enterResult(r)
    store.enterResult(makeResult('M79', 2, 1))

    // M01: Mexiko 1:0 → 2:0 — order-preserving (see invalidation.spec.ts).
    store.enterResult(makeResult('M01', 2, 0))

    expect(store.results['M79']).toEqual(makeResult('M79', 2, 1))
  })

  it('clearResult drops orphaned R32 results when clearing a group match makes the group incomplete', () => {
    const store = useTournamentStore()
    for (const r of Object.values(allGroupResults(1, 0))) store.enterResult(r)
    store.enterResult(makeResult('M73', 2, 1))

    store.clearResult('M01')

    expect(store.results['M01']).toBeUndefined()
    expect(store.results['M73']).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// localStorage rehydration (issue 2.4) — the persistedstate plugin's automatic
// rehydration bypasses parseImport's validation entirely, so the store's own
// `afterHydrate` hook must catch a corrupted entry itself.
// ---------------------------------------------------------------------------

describe('tournament store — localStorage rehydration', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPersistedPinia())
    vi.clearAllMocks()
  })

  it('rehydrates a valid results map from localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ results: { M01: makeResult('M01', 2, 1) } }))

    const store = useTournamentStore()

    expect(store.results).toEqual({ M01: makeResult('M01', 2, 1) })
  })

  it('resets to an empty state instead of propagating a non-object results value', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ results: 'not-an-object' }))

    const store = useTournamentStore()

    expect(store.results).toEqual({})
  })

  it('resets to an empty state instead of propagating an array masquerading as results', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ results: [makeResult('M01', 2, 1)] }))

    const store = useTournamentStore()

    expect(store.results).toEqual({})
  })

  it('resets to an empty state when a persisted result has a corrupted field (string instead of number)', () => {
    const corrupted = { ...makeResult('M01', 2, 1), homeGoals: '2' }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ results: { M01: corrupted } }))

    const store = useTournamentStore()

    expect(store.results).toEqual({})
  })

  it('resets to an empty state when a persisted result is keyed by an unknown match id', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ results: { NOPE: makeResult('NOPE', 2, 1) } }))

    const store = useTournamentStore()

    expect(store.results).toEqual({})
  })

  it('migrates results persisted under the v1 key: adopts, re-persists, drops the old entry', () => {
    localStorage.setItem('wc2026:results:v1', JSON.stringify({ results: { M01: makeResult('M01', 2, 1) } }))

    const store = useTournamentStore()

    expect(store.results).toEqual({ M01: makeResult('M01', 2, 1) })
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({ results: { M01: makeResult('M01', 2, 1) } })
    expect(localStorage.getItem('wc2026:results:v1')).toBeNull()
  })

  it('keeps current-key data over legacy data and still drops the legacy entry (no later resurrection)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ results: { M02: makeResult('M02', 1, 0) } }))
    localStorage.setItem('wc2026:results:v1', JSON.stringify({ results: { M01: makeResult('M01', 2, 1) } }))

    const store = useTournamentStore()

    expect(store.results).toEqual({ M02: makeResult('M02', 1, 0) })
    expect(localStorage.getItem('wc2026:results:v1')).toBeNull()
  })
})
