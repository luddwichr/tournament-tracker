// One `scoreboard?dates=START-END` request returns the whole date range —
// goals (competitor `score`) and cards (competition `details`) — with no cap,
// no auth, and CORS `*`. ESPN's `team.abbreviation` is the FIFA code, so
// lower-casing it yields our team id (`RSA` → `rsa`); knockout placeholders
// (`RD16 W1`) map to nothing and drop out.

import type { FetchResultsOptions, ResultsProvider, SourceMatch } from '../provider'
import { fixtures } from '../../../data/fixtures-2026'
import { teamsById } from '../../../data/teams'

const SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard'

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
  winner?: boolean
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
let nowImpl = defaultNow

function teamIdFromAbbr(abbr: string | undefined): string | null {
  if (!abbr) return null
  const id = abbr.toLowerCase()
  return teamsById.has(id) ? id : null
}

function nonNegativeInt(value: string | null | undefined): number {
  const n = Number.parseInt(value ?? '', 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function nonNegativeNumber(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
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
  return end < start ? null : { start, end }
}

async function fetchJson<T>(fetchImpl: typeof fetch, url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetchImpl(url, { signal: signal ?? null })
  if (!response.ok) throw new Error(`Unexpected status ${response.status}`)
  return (await response.json()) as T
}

function tallyCards(details: RawDetail[], homeTeamId: string | undefined, awayTeamId: string | undefined): CardTally {
  const tally: CardTally = { homeYellow: 0, homeRed: 0, awayYellow: 0, awayRed: 0 }
  for (const detail of details) {
    if (!detail.redCard && !detail.yellowCard) continue
    const isHome = detail.team?.id === homeTeamId
    const isAway = detail.team?.id === awayTeamId
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

/** ESPN's `score` is the goal count after extra time, which is level when a
 * shootout decided the match — but our `Result` has no penalty field (a level
 * knockout score is unresolvable, see `knockout.ts`). When a shootout
 * happened, ESPN reports it separately as `shootoutScore`; use that as the
 * stored score instead, matching the "enter the decisive score" convention
 * used for manual AET entries. `winner` is a last-resort tiebreak for the
 * (unobserved) case of a level shootout score. */
function decisiveGoals(home: RawCompetitor, away: RawCompetitor): { homeGoals: number; awayGoals: number } {
  const hadShootout = home.shootoutScore != null || away.shootoutScore != null
  const homeGoals = hadShootout ? nonNegativeNumber(home.shootoutScore) : nonNegativeInt(home.score)
  const awayGoals = hadShootout ? nonNegativeNumber(away.shootoutScore) : nonNegativeInt(away.score)
  if (homeGoals !== awayGoals) return { homeGoals, awayGoals }
  if (home.winner) return { homeGoals: awayGoals + 1, awayGoals }
  if (away.winner) return { homeGoals, awayGoals: homeGoals + 1 }
  return { homeGoals, awayGoals }
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
  return {
    homeId,
    awayId,
    ...decisiveGoals(home, away),
    ...cards,
    date: (event.date ?? '').slice(0, 10),
  }
}

async function fetchResults(opts: FetchResultsOptions = {}): Promise<SourceMatch[]> {
  const fetchImpl = opts.fetchImpl ?? fetch
  const range = fixtureDateRange(nowImpl())
  if (!range) return []

  const start = range.start.replaceAll('-', '')
  const end = range.end.replaceAll('-', '')
  const dates = start === end ? start : `${start}-${end}`

  let data: ScoreboardResponse
  try {
    data = await fetchJson<ScoreboardResponse>(fetchImpl, `${SCOREBOARD}?dates=${dates}`, opts.signal)
  } catch {
    throw new Error(NETWORK_ERROR)
  }

  const finished = (data.events ?? []).filter((event) => event.status?.type?.completed)
  const total = finished.length
  const matches: SourceMatch[] = []
  let done = 0
  for (const event of finished) {
    const match = toSourceMatch(event)
    if (match) matches.push(match)
    done++
    opts.onProgress?.(done, total)
  }
  return matches
}

export const espnProvider: ResultsProvider = {
  id: 'espn',
  label: 'ESPN',
  fetchResults,
}

// Exported for unit tests.
export const _internal = {
  teamIdFromAbbr,
  fixtureDateRange,
  setNow: (fn: () => Date) => {
    nowImpl = fn
  },
  reset: () => {
    nowImpl = defaultNow
  },
}
