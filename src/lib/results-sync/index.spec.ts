import { describe, it, expect, vi } from 'vitest'
import { buildResultsFromSource, syncResults, defaultProvider } from './index'
import type { ResultsProvider, SourceMatch } from './provider'
import { fixtures, groupMatches } from '../../data/fixtures-2026'
import { resolveTeamRef } from '../knockout'

function src(homeId: string, awayId: string, partial: Partial<SourceMatch> = {}): SourceMatch {
  return {
    awayGoals: 0,
    awayId,
    awayRed: 0,
    awayYellow: 0,
    date: '2026-06-11',
    homeGoals: 0,
    homeId,
    homeRed: 0,
    homeYellow: 0,
    ...partial,
  }
}

describe('buildResultsFromSource', () => {
  it('maps a group match onto its slot', () => {
    const results = buildResultsFromSource([
      src('mex', 'rsa', { awayGoals: 0, awayRed: 1, homeGoals: 2, homeYellow: 1 }),
    ])
    expect(results['M01']).toEqual({
      awayGoals: 0,
      awayRed: 1,
      awayYellow: 0,
      homeGoals: 2,
      homeRed: 0,
      homeYellow: 1,
      matchId: 'M01',
    })
  })

  it('orients goals and cards when the source reports the sides reversed', () => {
    // M01 is mex (home) vs rsa (away); source lists rsa as home.
    const results = buildResultsFromSource([
      src('rsa', 'mex', { awayGoals: 2, awayYellow: 1, homeGoals: 0, homeRed: 1 }),
    ])
    expect(results['M01']).toMatchObject({
      awayGoals: 0,
      awayRed: 1,
      homeGoals: 2,
      homeYellow: 1,
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
        awayGoals: 0,
        homeGoals: 1,
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
      src(home.id, away.id, { awayGoals: 1, date: '2026-06-28', homeGoals: 3 }),
    ])
    expect(withKnockout['M73']).toMatchObject({ awayGoals: 1, homeGoals: 3, matchId: 'M73' })
  })
})

describe('syncResults', () => {
  it('fetches from the given provider and maps the result', async () => {
    const provider: ResultsProvider = {
      fetchResults: vi.fn().mockResolvedValue([src('mex', 'rsa', { homeGoals: 4 })]),
      id: 'fake',
      label: 'Fake',
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
