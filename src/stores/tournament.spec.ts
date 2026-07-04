import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTournamentStore } from './tournament'
import { clearPossibleTeamsCache } from '../lib/possible-teams'
import { clearStandingsCache } from '../lib/standings'
import type { Result } from '../types/tournament'

// Partial-mock: keep every real export (computeGroupStandings, resultFingerprint, …)
// so standingsByGroup still computes correctly, but replace the cache-clearing
// functions with spies so `reset`/`importResults` can be verified without
// depending on cache-internal state.
vi.mock('../lib/possible-teams', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/possible-teams')>()
  return { ...original, clearPossibleTeamsCache: vi.fn() }
})

vi.mock('../lib/standings', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/standings')>()
  return { ...original, clearStandingsCache: vi.fn() }
})

function makeResult(matchId: string, homeGoals = 1, awayGoals = 0): Result {
  return { matchId, homeGoals, awayGoals, homeYellow: 0, homeRed: 0, awayYellow: 0, awayRed: 0 }
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
    expect(clearPossibleTeamsCache).toHaveBeenCalledTimes(1)
    expect(clearStandingsCache).toHaveBeenCalledTimes(1)
  })

  it('importResults replaces the whole results map and clears the caches', () => {
    const store = useTournamentStore()
    store.enterResult(makeResult('M01'))

    store.importResults({ M02: makeResult('M02', 3, 3) })

    expect(store.results).toEqual({ M02: makeResult('M02', 3, 3) })
    expect(clearPossibleTeamsCache).toHaveBeenCalledTimes(1)
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
