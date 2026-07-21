/**
 * Resolve TeamRefs for knockout matches.
 *
 * `resolveTeamRef` walks the reference chain groupRank → thirdPlace → matchWinner/matchLoser.
 * It returns null at any step that is not yet determinable from current results.
 *
 * A level result in a knockout match leaves winner and loser unresolvable.
 * That holds until shootout goals are entered, which make the folded score decisive.
 * See `Result` and `foldedScore` below.
 */

import type { Result, ResultsMap, Stage, Team, TeamRef } from '../types/tournament'
import { computeGroupStandings, isGroupComplete, isGroupStageComplete } from './standings'
import { fixturesById, knockoutMatches } from '../data/fixtures-2026'
import { assertNever } from './assert-never'
import { resolveThirdPlaceSlot } from './third-place'
import { teamsById } from '../data/teams'

/** Whether a penalty shootout decided this match, see `Result` for the invariants. */
export function decidedByShootout(result: Result): boolean {
  return result.homeShootoutGoals != null && result.awayShootoutGoals != null
}

/**
 * The score as displayed, with shootout goals folded into the real goals.
 * A decided match therefore always has a decisive score, so 1:1 with 4:2 i.E. becomes 5:3.
 * The regular score of a shootout match is level, so the folded score's winner is exactly the shootout's winner.
 */
export function foldedScore(result: Result): { home: number; away: number } {
  return {
    away: result.awayGoals + (result.awayShootoutGoals ?? 0),
    home: result.homeGoals + (result.homeShootoutGoals ?? 0),
  }
}

/**
 * Resolve a `matchWinner` or `matchLoser` ref to a concrete Team.
 * Returns null while the match is unplayed, its feeders are unresolved, or its score is still level.
 */
function resolveMatchOutcome(
  ref: Extract<TeamRef, { kind: 'matchWinner' | 'matchLoser' }>,
  results: ResultsMap,
): Team | null {
  const match = fixturesById.get(ref.matchId)
  if (!match) return null
  const matchResult = results[ref.matchId]
  if (!matchResult) return null

  const homeTeam = resolveTeamRef(match.homeRef, results)
  const awayTeam = resolveTeamRef(match.awayRef, results)
  if (!homeTeam || !awayTeam) return null

  const score = foldedScore(matchResult)
  if (score.home === score.away) return null
  const homeWon = score.home > score.away

  if (ref.kind === 'matchWinner') return homeWon ? homeTeam : awayTeam
  return homeWon ? awayTeam : homeTeam
}

/**
 * Resolve a TeamRef to a concrete Team given current results.
 * Returns null when the referenced team cannot yet be determined.
 */
export function resolveTeamRef(ref: TeamRef, results: ResultsMap): Team | null {
  switch (ref.kind) {
    case 'team': {
      return teamsById.get(ref.teamId) ?? null
    }

    case 'groupRank': {
      if (!isGroupComplete(ref.group, results)) return null
      const standings = computeGroupStandings(ref.group, results)
      return standings[ref.rank - 1]?.team ?? null
    }

    case 'thirdPlace': {
      return resolveThirdPlaceSlot(ref.slot, results)
    }

    case 'matchWinner':
    case 'matchLoser': {
      return resolveMatchOutcome(ref, results)
    }

    default: {
      return assertNever(ref, 'TeamRef kind')
    }
  }
}

/** A bracket column as rendered in `BracketView`, where the third-place and final matches share one column. */
export type BracketColumnStage = 'r32' | 'r16' | 'qf' | 'sf' | 'final'

const COLUMN_STAGE_ORDER: readonly BracketColumnStage[] = ['r32', 'r16', 'qf', 'sf', 'final']

const COLUMN_MATCH_STAGES: Record<BracketColumnStage, readonly Stage[]> = {
  final: ['third', 'final'],
  qf: ['qf'],
  r16: ['r16'],
  r32: ['r32'],
  sf: ['sf'],
}

/**
 * The bracket column to scroll to when opening the knockout view.
 * That is the earliest column that still has an unplayed match.
 * Returns null while the group stage is still ongoing, since the bracket isn't the focus yet.
 * Returns 'final' once every knockout match has been decided.
 */
export function currentBracketColumn(results: ResultsMap): BracketColumnStage | null {
  if (!isGroupStageComplete(results)) return null

  return (
    COLUMN_STAGE_ORDER.find((column) =>
      knockoutMatches.some((m) => COLUMN_MATCH_STAGES[column].includes(m.stage) && results[m.id] == null),
    ) ?? 'final'
  )
}
