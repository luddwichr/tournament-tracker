import { describe, it, expect, vi } from 'vitest'
import { buildResultsFromSource, syncResults, defaultProvider } from './index'
import type { ResultsProvider, SourceMatch } from './provider'
import { fixtures, groupMatches } from '../../data/fixtures-2026'
import { resolveTeamRef } from '../knockout'

function src(homeId: string, awayId: string, partial: Partial<SourceMatch> = {}): SourceMatch {
  return {
    homeId,
    awayId,
    homeGoals: 0,
    awayGoals: 0,
    homeYellow: 0,
    homeRed: 0,
    awayYellow: 0,
    awayRed: 0,
    date: '2026-06-11',
    ...partial,
  }
}

describe('buildResultsFromSource', () => {
  it('maps a group match onto its slot', () => {
    const results = buildResultsFromSource([
      src('mex', 'rsa', { homeGoals: 2, awayGoals: 0, homeYellow: 1, awayRed: 1 }),
    ])
    expect(results['M01']).toEqual({
      matchId: 'M01',
      homeGoals: 2,
      awayGoals: 0,
      homeYellow: 1,
      homeRed: 0,
      awayYellow: 0,
      awayRed: 1,
    })
  })

  it('orients goals and cards when the source reports the sides reversed', () => {
    // M01 is mex (home) vs rsa (away); source lists rsa as home.
    const results = buildResultsFromSource([
      src('rsa', 'mex', { homeGoals: 0, awayGoals: 2, homeRed: 1, awayYellow: 1 }),
    ])
    expect(results['M01']).toMatchObject({
      homeGoals: 2,
      awayGoals: 0,
      homeYellow: 1,
      awayRed: 1,
    })
  })

  it('returns an empty map and leaves knockout slots untouched when nothing is fetched', () => {
    const results = buildResultsFromSource([])
    expect(results).toEqual({})
    expect(results['M73']).toBeUndefined()
  })

  it('picks the candidate nearest the slot kickoff when a pair appears twice', () => {
    // First candidate is the nearest, so the later, farther one must not win.
    const results = buildResultsFromSource([
      src('mex', 'rsa', { date: '2026-06-11', homeGoals: 2 }),
      src('mex', 'rsa', { date: '2026-07-15', homeGoals: 9 }),
    ])
    expect(results['M01']!.homeGoals).toBe(2)
  })

  it('resolves a knockout slot once its feeder group results are present', () => {
    const groupSources = groupMatches.map((m) =>
      src((m.homeRef as { teamId: string }).teamId, (m.awayRef as { teamId: string }).teamId, {
        homeGoals: 1,
        awayGoals: 0,
      }),
    )

    const groupOnly = buildResultsFromSource(groupSources)
    expect(groupOnly['M73']).toBeUndefined()

    const m73 = fixtures.find((f) => f.id === 'M73')!
    const home = resolveTeamRef(m73.homeRef, groupOnly)!
    const away = resolveTeamRef(m73.awayRef, groupOnly)!
    expect(home).not.toBeNull()
    expect(away).not.toBeNull()

    const withKnockout = buildResultsFromSource([
      ...groupSources,
      src(home.id, away.id, { date: '2026-06-28', homeGoals: 3, awayGoals: 1 }),
    ])
    expect(withKnockout['M73']).toMatchObject({ matchId: 'M73', homeGoals: 3, awayGoals: 1 })
  })
})

describe('syncResults', () => {
  it('fetches from the given provider and maps the result', async () => {
    const provider: ResultsProvider = {
      id: 'fake',
      label: 'Fake',
      fetchResults: vi.fn().mockResolvedValue([src('mex', 'rsa', { homeGoals: 4 })]),
    }
    const results = await syncResults(provider)
    expect(provider.fetchResults).toHaveBeenCalledOnce()
    expect(results['M01']!.homeGoals).toBe(4)
  })

  it('falls back to the default provider when none is given', async () => {
    const spy = vi.spyOn(defaultProvider, 'fetchResults').mockResolvedValue([src('mex', 'rsa', { homeGoals: 5 })])
    const results = await syncResults()
    expect(results['M01']!.homeGoals).toBe(5)
    spy.mockRestore()
  })
})
