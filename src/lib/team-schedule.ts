import type { MatchSlot, Result, ResultsMap, Team } from '../types/tournament'
import { fixtures } from '../data/fixtures-2026'
import { resolveTeamRef } from './knockout'

export interface TeamMatchEntry {
  match: MatchSlot
  homeTeam: Team | null
  awayTeam: Team | null
  result: Result | null
}

/**
 * All fixtures `team` participates in.
 * Knockout matches are included as soon as this team's side of the bracket resolves to it.
 * That holds even while the other side is still an unresolved placeholder such as "Sieger Gruppe B".
 */
export function matchesForTeam(team: Team, results: ResultsMap): TeamMatchEntry[] {
  return fixtures
    .map((match) => ({
      awayTeam: resolveTeamRef(match.awayRef, results),
      homeTeam: resolveTeamRef(match.homeRef, results),
      match,
      result: results[match.id] ?? null,
    }))
    .filter((entry) => entry.homeTeam?.id === team.id || entry.awayTeam?.id === team.id)
}

export interface TeamOverallStats {
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  yellowCards: number
  redCards: number
}

/**
 * Aggregate `team`'s played matches from `matchesForTeam` into overall stats.
 *
 * This uses `homeGoals` and `awayGoals` as stored, which are the real goals and never shootout kicks.
 * So per FIFA statistical convention a shootout-decided match counts as a draw.
 * Its penalty goals also don't inflate the goal tally.
 */
export function computeTeamStats(team: Team, entries: TeamMatchEntry[]): TeamOverallStats {
  const stats: TeamOverallStats = {
    draws: 0,
    goalsAgainst: 0,
    goalsFor: 0,
    losses: 0,
    played: 0,
    redCards: 0,
    wins: 0,
    yellowCards: 0,
  }

  for (const { homeTeam, result } of entries) {
    if (!result) continue
    const isHome = homeTeam?.id === team.id
    const goalsFor = isHome ? result.homeGoals : result.awayGoals
    const goalsAgainst = isHome ? result.awayGoals : result.homeGoals

    stats.played++
    stats.goalsFor += goalsFor
    stats.goalsAgainst += goalsAgainst
    stats.yellowCards += isHome ? result.homeYellow : result.awayYellow
    stats.redCards += isHome ? result.homeRed : result.awayRed

    if (goalsFor > goalsAgainst) stats.wins++
    else if (goalsFor < goalsAgainst) stats.losses++
    else stats.draws++
  }

  return stats
}
