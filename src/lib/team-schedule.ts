import type { MatchSlot, Result, ResultsMap, Stage, Team } from '../types/tournament'
import { fixtures } from '../data/fixtures-2026'
import { resolveTeamRef } from './knockout'

/** Display label for every stage but `group`, which is numbered per-team instead (see `matchStageLabel`). */
export const KNOCKOUT_STAGE_LABEL: Record<Exclude<Stage, 'group'>, string> = {
  r32: 'Runde der 32',
  r16: 'Achtelfinale',
  qf: 'Viertelfinale',
  sf: 'Halbfinale',
  third: 'Spiel um Platz 3',
  final: 'Finale',
}

/**
 * Human-readable label for one of a team's own matches, e.g. "Gruppenspiel 2/3"
 * or "Achtelfinale". `groupMatchNumber` is the 1-based index of this match
 * among the team's own group-stage matches (only meaningful when `stage`
 * is `'group'`).
 */
export function matchStageLabel(stage: Stage, groupMatchNumber: number): string {
  if (stage === 'group') return `Gruppenspiel ${groupMatchNumber}/3`
  return KNOCKOUT_STAGE_LABEL[stage]
}

export interface TeamMatchEntry {
  match: MatchSlot
  homeTeam: Team | null
  awayTeam: Team | null
  result: Result | null
}

/**
 * All fixtures `team` participates in. Knockout matches are included as soon
 * as this team's side of the bracket resolves to it, even while the other
 * side is still an unresolved placeholder (e.g. "Sieger Gruppe B").
 */
export function matchesForTeam(team: Team, results: ResultsMap): TeamMatchEntry[] {
  return fixtures
    .map((match) => ({
      match,
      homeTeam: resolveTeamRef(match.homeRef, results),
      awayTeam: resolveTeamRef(match.awayRef, results),
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

/** Aggregate `team`'s played matches (from `matchesForTeam`) into overall stats. */
export function computeTeamStats(team: Team, entries: TeamMatchEntry[]): TeamOverallStats {
  const stats: TeamOverallStats = {
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    yellowCards: 0,
    redCards: 0,
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
