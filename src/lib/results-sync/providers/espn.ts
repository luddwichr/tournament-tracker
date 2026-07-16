// One `scoreboard?dates=START-END` request returns the whole date range —
// goals (competitor `score`) and cards (competition `details`) — with no auth
// and CORS `*`. ESPN's `team.abbreviation` is the FIFA code, so lower-casing it
// yields our team id (`RSA` → `rsa`); knockout placeholders (`RD16 W1`) map to
// nothing and drop out. The endpoint defaults to 100 events per request, which
// silently drops the tail of a 104-match tournament (semi-finals onward), so we
// pass an explicit `limit` wide enough to cover every fixture.

import type { FetchResultsOptions, ResultsProvider, SourceMatch } from '../provider'
import { fixtures } from '../../../data/fixtures-2026'
import { teamsById } from '../../../data/teams'

const SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard'

// ESPN's scoreboard pages at 100 events by default; ask for enough to return
// every fixture in one call, with headroom for replays/re-scheduled entries.
const EVENT_LIMIT = fixtures.length + 50

const NETWORK_ERROR = 'Ergebnisse konnten nicht abgerufen werden. Bitte Internetverbindung prüfen und erneut versuchen.'

// Raw scoreboard shapes (only the fields we read).
interface RawTeam {
  id?: string
  abbreviation?: string
}
interface RawCompetitor {
  homeAway?: string
  score?: string | null
  shootoutScore?: number | null
  team?: RawTeam
}
interface RawDetail {
  redCard?: boolean
  yellowCard?: boolean
  team?: { id?: string }
}
interface RawCompetition {
  competitors?: RawCompetitor[]
  details?: RawDetail[]
}
interface RawEvent {
  date?: string
  status?: { type?: { completed?: boolean } }
  competitions?: RawCompetition[]
}
interface ScoreboardResponse {
  events?: RawEvent[] | null
}

interface CardTally {
  homeYellow: number
  homeRed: number
  awayYellow: number
  awayRed: number
}

const defaultNow = (): Date => new Date()

function teamIdFromAbbr(abbr: string | undefined): string | null {
  if (!abbr) return null
  const id = abbr.toLowerCase()
  return teamsById.has(id) ? id : null
}

function nonNegativeInt(value: string | null | undefined): number {
  const n = Number.parseInt(value ?? '', 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function nonNegativeInteger(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 0
}

function fixtureDate(kickoff: string): string {
  return new Date(kickoff).toISOString().slice(0, 10)
}

/** First fixture date through the earlier of the last fixture date and today,
 * so no future days are queried. `null` before the tournament starts. */
function fixtureDateRange(now: Date): { start: string; end: string } | null {
  let start = ''
  let last = ''
  for (const slot of fixtures) {
    const day = fixtureDate(slot.kickoff)
    if (!start || day < start) start = day
    if (!last || day > last) last = day
  }
  const today = now.toISOString().slice(0, 10)
  const end = last < today ? last : today
  return end < start ? null : { end, start }
}

async function fetchJson<T>(fetchImpl: typeof fetch, url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetchImpl(url, { signal: signal ?? null })
  if (!response.ok) throw new Error(`Unexpected status ${response.status}`)
  return (await response.json()) as T
}

function tallyCards(details: RawDetail[], homeTeamId: string | undefined, awayTeamId: string | undefined): CardTally {
  const tally: CardTally = { awayRed: 0, awayYellow: 0, homeRed: 0, homeYellow: 0 }
  for (const detail of details) {
    if (!detail.redCard && !detail.yellowCard) continue
    const isHome = homeTeamId != null && detail.team?.id === homeTeamId
    const isAway = awayTeamId != null && detail.team?.id === awayTeamId
    if (!isHome && !isAway) continue
    if (detail.redCard) {
      if (isHome) tally.homeRed++
      else tally.awayRed++
    } else {
      if (isHome) tally.homeYellow++
      else tally.awayYellow++
    }
  }
  return tally
}

function toSourceMatch(event: RawEvent): SourceMatch | null {
  const competition = event.competitions?.[0]
  const competitors = competition?.competitors ?? []
  const home = competitors.find((c) => c.homeAway === 'home')
  const away = competitors.find((c) => c.homeAway === 'away')
  if (!home || !away) return null

  const homeId = teamIdFromAbbr(home.team?.abbreviation)
  const awayId = teamIdFromAbbr(away.team?.abbreviation)
  if (!homeId || !awayId) return null

  const cards = tallyCards(competition?.details ?? [], home.team?.id, away.team?.id)
  // ESPN's `score` is the real goal count after extra time — which is level
  // when a shootout decided the match — with the shootout reported separately
  // as `shootoutScore`. That matches `SourceMatch` directly; only report a
  // shootout when either side actually scored in one.
  const homeShootout = nonNegativeInteger(home.shootoutScore)
  const awayShootout = nonNegativeInteger(away.shootoutScore)
  const shootout =
    homeShootout > 0 || awayShootout > 0
      ? { awayShootoutGoals: awayShootout, homeShootoutGoals: homeShootout }
      : undefined
  return {
    awayGoals: nonNegativeInt(away.score),
    awayId,
    homeGoals: nonNegativeInt(home.score),
    homeId,
    ...shootout,
    ...cards,
    date: (event.date ?? '').slice(0, 10),
  }
}

async function fetchResults(opts: FetchResultsOptions = {}): Promise<SourceMatch[]> {
  const fetchImpl = opts.fetchImpl ?? fetch
  const now = opts.now ?? defaultNow
  const range = fixtureDateRange(now())
  if (!range) return []

  const start = range.start.replaceAll('-', '')
  const end = range.end.replaceAll('-', '')
  const dates = start === end ? start : `${start}-${end}`

  let data: ScoreboardResponse
  try {
    data = await fetchJson<ScoreboardResponse>(
      fetchImpl,
      `${SCOREBOARD}?dates=${dates}&limit=${EVENT_LIMIT}`,
      opts.signal,
    )
  } catch (e) {
    // Cancellation isn't a fetch failure — let AbortError propagate as-is so
    // callers can tell "the user cancelled" from "the network is broken".
    if (e instanceof Error && e.name === 'AbortError') throw e
    throw new Error(NETWORK_ERROR, { cause: e })
  }

  const finished = (data.events ?? []).filter((event) => event.status?.type?.completed)
  const matches: SourceMatch[] = []
  for (const event of finished) {
    const match = toSourceMatch(event)
    if (match) matches.push(match)
  }
  return matches
}

export const espnProvider: ResultsProvider = {
  fetchResults,
}

// Exported for unit tests.
// oxlint-disable-next-line no-underscore-dangle -- leading underscore is a deliberate "not part of the public API" convention here
export const _internal = {
  fixtureDateRange,
  teamIdFromAbbr,
}
