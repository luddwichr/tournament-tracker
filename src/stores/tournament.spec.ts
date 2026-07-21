// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { STORAGE_KEY } from '../lib/persistence'
import { clearStandingsCache } from '../lib/standings'
import { createApp } from 'vue'
import { freePossibleTeamsMemory } from '../lib/possible-teams'
import { invalidatedDownstream } from '../lib/invalidation'
import { makeResult } from '../test-support/results'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { useTournamentStore } from './tournament'

// Partial-mock: keep every real export (computeGroupStandings, resultFingerprint, …)
// so standingsByGroup still computes correctly, but replace the cache-clearing
// functions with spies so `reset`/`importResults` can be verified without
// depending on cache-internal state.
vi.mock('../lib/possible-teams', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/possible-teams')>()
  return { ...original, freePossibleTeamsMemory: vi.fn<() => void>() }
})

vi.mock('../lib/standings', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/standings')>()
  return { ...original, clearStandingsCache: vi.fn<() => void>() }
})

// Spy on the invalidation detector (keeping resultsWithout real) so the store
// tests can prove *wiring* without re-encoding the standings math, which is invalidation.spec.ts's job.
// The wiring is that enterResult and clearResult feed the pending edit to invalidatedDownstream and drop exactly the
// ids it returns.
// This defaults to "nothing invalidated" so the unrelated tests behave as a plain store.
vi.mock('../lib/invalidation', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/invalidation')>()
  return { ...original, invalidatedDownstream: vi.fn<typeof original.invalidatedDownstream>(() => []) }
})

// Pinia only activates plugins queued via `pinia.use(...)` once the pinia
// instance is actually installed into an app (mirrors main.ts's
// `createApp(App).use(pinia)`).
// Merely calling `setActivePinia` skips that step, so the persistedstate plugin would silently never hydrate.
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

// enterResult and clearResult enforce the "no stale downstream knockout result" invariant themselves.
// These tests prove only the *wiring* to invalidatedDownstream, which is spied above.
// The standings math that decides which matches are actually invalidated lives in src/lib/invalidation.spec.ts.
// The end-to-end confirm flow lives in src/components/ScoreDialog.spec.ts.

describe('tournament store — invalidation invariant', () => {
  it('enterResult feeds the pending edit to invalidatedDownstream and drops exactly the ids it returns', () => {
    const store = useTournamentStore()
    store.enterResult(makeResult('M90', 2, 1)) // a stored downstream result
    vi.mocked(invalidatedDownstream).mockReturnValueOnce(['M90'])

    const edit = makeResult('M73', 2, 1)
    store.enterResult(edit)

    expect(invalidatedDownstream).toHaveBeenLastCalledWith(expect.any(Object), 'M73', edit)
    expect(store.results['M73']).toEqual(edit)
    expect(store.results['M90']).toBeUndefined()
  })

  it('enterResult keeps every downstream result when the detector reports none', () => {
    const store = useTournamentStore()
    store.enterResult(makeResult('M90', 2, 1))

    store.enterResult(makeResult('M73', 2, 1)) // detector returns [] by default

    expect(store.results['M73']).toBeDefined()
    expect(store.results['M90']).toBeDefined()
  })

  it('clearResult removes the cleared match plus the downstream ids the detector reports', () => {
    const store = useTournamentStore()
    store.enterResult(makeResult('M01', 1, 0))
    store.enterResult(makeResult('M73', 2, 1))
    vi.mocked(invalidatedDownstream).mockReturnValueOnce(['M73'])

    store.clearResult('M01')

    expect(invalidatedDownstream).toHaveBeenLastCalledWith(expect.any(Object), 'M01', null)
    expect(store.results['M01']).toBeUndefined()
    expect(store.results['M73']).toBeUndefined()
  })
})

// The persistedstate plugin's automatic rehydration bypasses parseImport's validation entirely.
// So the store's own `afterHydrate` hook must catch a corrupted entry itself.

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
