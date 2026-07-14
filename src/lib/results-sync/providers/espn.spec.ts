import { _internal, espnProvider } from './espn'
import { afterEach, describe, expect, it, vi } from 'vitest'

interface TeamSide {
  id: string
  abbr: string
  score?: string | null
  shootoutScore?: number | null
}

function ev(opts: {
  home?: TeamSide
  away?: TeamSide
  completed?: boolean
  details?: unknown[]
  date?: string
  competition?: boolean
}) {
  const { home, away, completed = true, details = [], date = '2026-06-11T19:00Z', competition = true } = opts
  const competitors: unknown[] = []
  if (home)
    competitors.push({
      homeAway: 'home',
      score: home.score,
      shootoutScore: home.shootoutScore,
      team: { abbreviation: home.abbr, id: home.id },
    })
  if (away)
    competitors.push({
      homeAway: 'away',
      score: away.score,
      shootoutScore: away.shootoutScore,
      team: { abbreviation: away.abbr, id: away.id },
    })
  return {
    competitions: competition ? [{ competitors, details }] : [],
    date,
    status: { type: { completed } },
  }
}

function okResponse(data: unknown) {
  return { json: () => Promise.resolve(data), ok: true, status: 200 }
}

/** A fake `fetch` returning `data`, recording the URLs it was called with. */
function recordingFetch(data: unknown) {
  const calls: string[] = []
  const impl = ((input: RequestInfo | URL) => {
    calls.push(input instanceof Request ? input.url : String(input))
    return Promise.resolve(okResponse(data))
  }) as unknown as typeof fetch
  return { calls, impl }
}

// Pin "now" to mid-tournament so the query range is deterministic.
const pinnedNow = () => new Date('2026-07-02T00:00:00Z')

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('espnProvider.fetchResults', () => {
  it('maps finished matches with goals and cards, skipping the rest', async () => {
    const data = {
      events: [
        ev({
          away: { abbr: 'RSA', id: '467', score: '0' },
          details: [
            { team: { id: '203' }, yellowCard: true }, // home yellow
            { redCard: true, team: { id: '203' } }, // home red
            { team: { id: '467' }, yellowCard: true }, // away yellow
            { redCard: true, team: { id: '467' } }, // away red
            { redCard: false, team: { id: '203' }, yellowCard: false }, // not a card → ignored
            { redCard: true, team: { id: '999' } }, // unknown team → ignored
          ],
          home: { abbr: 'MEX', id: '203', score: '2' },
        }),
        // completed but an unresolved placeholder → unknown abbreviation → skipped
        ev({ away: { abbr: 'RSA', id: '467', score: '0' }, home: { abbr: 'RD16 W1', id: '1', score: '0' } }),
        // completed but missing the away competitor → skipped
        ev({ home: { abbr: 'MEX', id: '203', score: '1' } }),
        // completed but no competition object → skipped
        ev({ away: { abbr: 'RSA', id: '467' }, competition: false, home: { abbr: 'MEX', id: '203' } }),
        // not completed → filtered out before mapping
        ev({
          away: { abbr: 'MAR', id: '20', score: '1' },
          completed: false,
          home: { abbr: 'BRA', id: '10', score: '1' },
        }),
      ],
    }
    const { impl } = recordingFetch(data)

    const matches = await espnProvider.fetchResults({ fetchImpl: impl, now: pinnedNow })

    expect(matches).toEqual([
      {
        awayGoals: 0,
        awayId: 'rsa',
        awayRed: 1,
        awayYellow: 1,
        date: '2026-06-11',
        homeGoals: 2,
        homeId: 'mex',
        homeRed: 1,
        homeYellow: 1,
      },
    ])
  })

  it('clamps missing or negative scores and tolerates a missing date', async () => {
    const data = {
      events: [
        {
          // no `date` field at all
          competitions: [
            {
              competitors: [
                { homeAway: 'home', score: '-1', team: { abbreviation: 'GER', id: '17' } },
                { homeAway: 'away', score: null, team: { abbreviation: 'ECU', id: '23' } },
              ],
              details: [],
            },
          ],
          status: { type: { completed: true } },
        },
      ],
    }
    const { impl } = recordingFetch(data)
    const [match] = await espnProvider.fetchResults({ fetchImpl: impl, now: pinnedNow })
    expect(match).toMatchObject({ awayGoals: 0, date: '', homeGoals: 0, homeId: 'ger' })
  })

  it('reports shootout goals separately from the real score', async () => {
    const data = {
      events: [
        ev({
          away: { abbr: 'PAR', id: '23', score: '1', shootoutScore: 4 },
          home: { abbr: 'GER', id: '17', score: '1', shootoutScore: 3 },
        }),
      ],
    }
    const { impl } = recordingFetch(data)
    const [match] = await espnProvider.fetchResults({ fetchImpl: impl, now: pinnedNow })
    // `score` stays the real goal count; the shootout travels in its own fields.
    expect(match).toMatchObject({ awayGoals: 1, awayShootoutGoals: 4, homeGoals: 1, homeShootoutGoals: 3 })
  })

  it('clamps a malformed shootoutScore to 0 while keeping the other side', async () => {
    const data = {
      events: [
        ev({
          away: { abbr: 'PAR', id: '23', score: '1', shootoutScore: 4.5 },
          home: { abbr: 'GER', id: '17', score: '1', shootoutScore: 3 },
        }),
      ],
    }
    const { impl } = recordingFetch(data)
    const [match] = await espnProvider.fetchResults({ fetchImpl: impl, now: pinnedNow })
    expect(match).toMatchObject({ awayShootoutGoals: 0, homeShootoutGoals: 3 })
  })

  it('leaves a level score untouched when there was no shootout', async () => {
    const data = {
      events: [
        ev({
          away: { abbr: 'MAR', id: '20', score: '1' },
          home: { abbr: 'BRA', id: '10', score: '1' },
        }),
      ],
    }
    const { impl } = recordingFetch(data)
    const [match] = await espnProvider.fetchResults({ fetchImpl: impl, now: pinnedNow })
    expect(match).toMatchObject({ awayGoals: 1, homeGoals: 1 })
    expect(match!.homeShootoutGoals).toBeUndefined()
    expect(match!.awayShootoutGoals).toBeUndefined()
  })

  it('does not attribute a card to either side when both team ids are unknown', async () => {
    const data = {
      events: [
        {
          competitions: [
            {
              competitors: [
                { homeAway: 'home', score: '1', team: { abbreviation: 'MEX' } },
                { homeAway: 'away', score: '0', team: { abbreviation: 'RSA' } },
              ],
              // Neither detail carries a team id, matching the competitors above (also id-less).
              details: [{ team: {}, yellowCard: true }, { redCard: true }],
            },
          ],
          date: '2026-06-11T19:00Z',
          status: { type: { completed: true } },
        },
      ],
    }
    const { impl } = recordingFetch(data)
    const [match] = await espnProvider.fetchResults({ fetchImpl: impl, now: pinnedNow })
    expect(match).toMatchObject({ awayRed: 0, awayYellow: 0, homeRed: 0, homeYellow: 0 })
  })

  it('requests the whole elapsed range in a single call', async () => {
    const { impl, calls } = recordingFetch({ events: [] })
    await espnProvider.fetchResults({ fetchImpl: impl, now: pinnedNow })
    expect(calls).toHaveLength(1)
    expect(calls[0]).toContain('dates=20260611-20260702')
  })

  it('uses a single date when the range spans one day', async () => {
    const { impl, calls } = recordingFetch({ events: [] })
    await espnProvider.fetchResults({ fetchImpl: impl, now: () => new Date('2026-06-11T23:00:00Z') })
    expect(calls[0]).toContain('dates=20260611')
    expect(calls[0]).not.toContain('20260611-')
  })

  it('forwards the abort signal to fetch', async () => {
    const controller = new AbortController()
    let seen: AbortSignal | null | undefined
    const fetchImpl = ((_input: RequestInfo | URL, init?: RequestInit) => {
      seen = init?.signal
      return Promise.resolve(okResponse({ events: [] }))
    }) as unknown as typeof fetch
    await espnProvider.fetchResults({ fetchImpl, now: pinnedNow, signal: controller.signal })
    expect(seen).toBe(controller.signal)
  })

  it('fetches nothing before the tournament starts', async () => {
    const fetchImpl = vi.fn()
    expect(await espnProvider.fetchResults({ fetchImpl, now: () => new Date('2020-01-01T00:00:00Z') })).toEqual([])
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('rejects with a user-readable error when the request is not ok', async () => {
    const fetchImpl = (() =>
      Promise.resolve({ json: () => Promise.resolve({}), ok: false, status: 503 })) as unknown as typeof fetch
    await expect(espnProvider.fetchResults({ fetchImpl, now: pinnedNow })).rejects.toThrow(/nicht abgerufen werden/)
  })

  it('rejects with a user-readable error preserving the original failure as `cause`', async () => {
    const networkFailure = new Error('offline')
    const fetchImpl = (() => Promise.reject(networkFailure)) as unknown as typeof fetch
    await expect(espnProvider.fetchResults({ fetchImpl, now: pinnedNow })).rejects.toThrow(/Internetverbindung/)
    await expect(espnProvider.fetchResults({ fetchImpl, now: pinnedNow })).rejects.toMatchObject({
      cause: networkFailure,
    })
  })

  it('rethrows an AbortError as-is instead of masking it as a network error', async () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError')
    const fetchImpl = (() => Promise.reject(abortError)) as unknown as typeof fetch
    await expect(espnProvider.fetchResults({ fetchImpl, now: pinnedNow })).rejects.toBe(abortError)
  })

  it('uses the global fetch when no fetchImpl is supplied', async () => {
    const { impl } = recordingFetch({ events: [] })
    vi.stubGlobal('fetch', impl)
    expect(await espnProvider.fetchResults({ now: pinnedNow })).toEqual([])
  })
})

describe('teamIdFromAbbr', () => {
  it('maps FIFA-code abbreviations to app team ids', () => {
    expect(_internal.teamIdFromAbbr('RSA')).toBe('rsa')
    expect(_internal.teamIdFromAbbr('MEX')).toBe('mex')
  })

  it('returns null for placeholders and missing abbreviations', () => {
    expect(_internal.teamIdFromAbbr('RD16 W1')).toBeNull()
    expect(_internal.teamIdFromAbbr(undefined)).toBeNull()
  })
})

describe('fixtureDateRange', () => {
  it('spans the first fixture through today while the tournament is on', () => {
    const range = _internal.fixtureDateRange(new Date('2026-07-02T12:00:00Z'))
    expect(range).toEqual({ end: '2026-07-02', start: '2026-06-11' })
  })

  it('caps the end at the last fixture once the tournament is over', () => {
    const range = _internal.fixtureDateRange(new Date('2027-01-01T00:00:00Z'))
    expect(range?.start).toBe('2026-06-11')
    expect(range?.end).toMatch(/^2026-07-/)
  })

  it('returns null before the tournament starts', () => {
    expect(_internal.fixtureDateRange(new Date('2020-01-01T00:00:00Z'))).toBeNull()
  })
})
