import { describe, it, expect, vi, afterEach } from 'vitest'
import { espnProvider, _internal } from './espn'

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
      team: { id: home.id, abbreviation: home.abbr },
    })
  if (away)
    competitors.push({
      homeAway: 'away',
      score: away.score,
      shootoutScore: away.shootoutScore,
      team: { id: away.id, abbreviation: away.abbr },
    })
  return {
    date,
    status: { type: { completed } },
    competitions: competition ? [{ competitors, details }] : [],
  }
}

function okResponse(data: unknown) {
  return { ok: true, status: 200, json: async () => data }
}

/** A fake `fetch` returning `data`, recording the URLs it was called with. */
function recordingFetch(data: unknown) {
  const calls: string[] = []
  const impl = (async (input: RequestInfo | URL) => {
    calls.push(String(input))
    return okResponse(data)
  }) as unknown as typeof fetch
  return { impl, calls }
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
          home: { id: '203', abbr: 'MEX', score: '2' },
          away: { id: '467', abbr: 'RSA', score: '0' },
          details: [
            { yellowCard: true, team: { id: '203' } }, // home yellow
            { redCard: true, team: { id: '203' } }, // home red
            { yellowCard: true, team: { id: '467' } }, // away yellow
            { redCard: true, team: { id: '467' } }, // away red
            { yellowCard: false, redCard: false, team: { id: '203' } }, // not a card → ignored
            { redCard: true, team: { id: '999' } }, // unknown team → ignored
          ],
        }),
        // completed but an unresolved placeholder → unknown abbreviation → skipped
        ev({ home: { id: '1', abbr: 'RD16 W1', score: '0' }, away: { id: '467', abbr: 'RSA', score: '0' } }),
        // completed but missing the away competitor → skipped
        ev({ home: { id: '203', abbr: 'MEX', score: '1' } }),
        // completed but no competition object → skipped
        ev({ home: { id: '203', abbr: 'MEX' }, away: { id: '467', abbr: 'RSA' }, competition: false }),
        // not completed → filtered out before mapping
        ev({
          home: { id: '10', abbr: 'BRA', score: '1' },
          away: { id: '20', abbr: 'MAR', score: '1' },
          completed: false,
        }),
      ],
    }
    const { impl } = recordingFetch(data)

    const matches = await espnProvider.fetchResults({ fetchImpl: impl, now: pinnedNow })

    expect(matches).toEqual([
      {
        homeId: 'mex',
        awayId: 'rsa',
        homeGoals: 2,
        awayGoals: 0,
        homeYellow: 1,
        homeRed: 1,
        awayYellow: 1,
        awayRed: 1,
        date: '2026-06-11',
      },
    ])
  })

  it('clamps missing or negative scores and tolerates a missing date', async () => {
    const data = {
      events: [
        {
          // no `date` field at all
          status: { type: { completed: true } },
          competitions: [
            {
              competitors: [
                { homeAway: 'home', score: '-1', team: { id: '17', abbreviation: 'GER' } },
                { homeAway: 'away', score: null, team: { id: '23', abbreviation: 'ECU' } },
              ],
              details: [],
            },
          ],
        },
      ],
    }
    const { impl } = recordingFetch(data)
    const [match] = await espnProvider.fetchResults({ fetchImpl: impl, now: pinnedNow })
    expect(match).toMatchObject({ homeId: 'ger', homeGoals: 0, awayGoals: 0, date: '' })
  })

  it('folds shootout goals into the final score when a shootout decided the match', async () => {
    const data = {
      events: [
        ev({
          home: { id: '17', abbr: 'GER', score: '1', shootoutScore: 3 },
          away: { id: '23', abbr: 'PAR', score: '1', shootoutScore: 4 },
        }),
      ],
    }
    const { impl } = recordingFetch(data)
    const [match] = await espnProvider.fetchResults({ fetchImpl: impl, now: pinnedNow })
    // Regulation/AET goals plus penalty goals per side — 1:1 (3:4 pens) → 4:5.
    expect(match).toMatchObject({ homeGoals: 4, awayGoals: 5 })
  })

  it('leaves a level score untouched when there was no shootout', async () => {
    const data = {
      events: [
        ev({
          home: { id: '10', abbr: 'BRA', score: '1' },
          away: { id: '20', abbr: 'MAR', score: '1' },
        }),
      ],
    }
    const { impl } = recordingFetch(data)
    const [match] = await espnProvider.fetchResults({ fetchImpl: impl, now: pinnedNow })
    expect(match).toMatchObject({ homeGoals: 1, awayGoals: 1 })
  })

  it('does not attribute a card to either side when both team ids are unknown', async () => {
    const data = {
      events: [
        {
          date: '2026-06-11T19:00Z',
          status: { type: { completed: true } },
          competitions: [
            {
              competitors: [
                { homeAway: 'home', score: '1', team: { abbreviation: 'MEX' } },
                { homeAway: 'away', score: '0', team: { abbreviation: 'RSA' } },
              ],
              // Neither detail carries a team id, matching the competitors above (also id-less).
              details: [{ yellowCard: true, team: {} }, { redCard: true }],
            },
          ],
        },
      ],
    }
    const { impl } = recordingFetch(data)
    const [match] = await espnProvider.fetchResults({ fetchImpl: impl, now: pinnedNow })
    expect(match).toMatchObject({ homeYellow: 0, homeRed: 0, awayYellow: 0, awayRed: 0 })
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
    const fetchImpl = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      seen = init?.signal
      return okResponse({ events: [] })
    }) as unknown as typeof fetch
    await espnProvider.fetchResults({ fetchImpl, signal: controller.signal, now: pinnedNow })
    expect(seen).toBe(controller.signal)
  })

  it('fetches nothing before the tournament starts', async () => {
    const fetchImpl = vi.fn()
    expect(await espnProvider.fetchResults({ fetchImpl, now: () => new Date('2020-01-01T00:00:00Z') })).toEqual([])
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('rejects with a user-readable error when the request is not ok', async () => {
    const fetchImpl = (async () => ({ ok: false, status: 503, json: async () => ({}) })) as unknown as typeof fetch
    await expect(espnProvider.fetchResults({ fetchImpl, now: pinnedNow })).rejects.toThrow(/nicht abgerufen werden/)
  })

  it('rejects with a user-readable error preserving the original failure as `cause`', async () => {
    const networkFailure = new Error('offline')
    const fetchImpl = (async () => {
      throw networkFailure
    }) as unknown as typeof fetch
    await expect(espnProvider.fetchResults({ fetchImpl, now: pinnedNow })).rejects.toThrow(/Internetverbindung/)
    await expect(espnProvider.fetchResults({ fetchImpl, now: pinnedNow })).rejects.toMatchObject({
      cause: networkFailure,
    })
  })

  it('rethrows an AbortError as-is instead of masking it as a network error', async () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError')
    const fetchImpl = (async () => {
      throw abortError
    }) as unknown as typeof fetch
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
    expect(range).toEqual({ start: '2026-06-11', end: '2026-07-02' })
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
