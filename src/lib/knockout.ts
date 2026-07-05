/**
 * Resolve TeamRefs for knockout matches.
 *
 * `resolveTeamRef` walks the reference chain — groupRank → thirdPlace →
 * matchWinner/matchLoser — returning null at any step that is not yet
 * determinable from current results.
 *
 * A level result in a knockout match leaves winner/loser unresolvable unless
 * `Result.shootoutWinner` is set — otherwise users must enter the decisive
 * score (e.g. the AET score when extra time settled it without a shootout).
 */

import type { Stage, TeamRef, Team, Result } from '../types/tournament'
import { GROUP_IDS } from '../types/tournament'
import { fixturesById, knockoutMatches } from '../data/fixtures-2026'
import { teamsById } from '../data/teams'
import { computeGroupStandings, isGroupComplete } from './standings'
import { resolveThirdPlaceSlot } from './third-place'
import { assertNever } from './assert-never'

/**
 * Resolve a TeamRef to a concrete Team given current results.
 * Returns null when the referenced team cannot yet be determined.
 */
export function resolveTeamRef(ref: TeamRef, results: Record<string, Result>): Team | null {
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
      const match = fixturesById.get(ref.matchId)
      if (!match) return null
      const matchResult = results[ref.matchId]
      if (!matchResult) return null

      const homeTeam = resolveTeamRef(match.homeRef, results)
      const awayTeam = resolveTeamRef(match.awayRef, results)
      if (!homeTeam || !awayTeam) return null

      let homeWon: boolean
      if (matchResult.homeGoals !== matchResult.awayGoals) {
        homeWon = matchResult.homeGoals > matchResult.awayGoals
      } else if (matchResult.shootoutWinner) {
        homeWon = matchResult.shootoutWinner === 'home'
      } else {
        return null
      }

      if (ref.kind === 'matchWinner') return homeWon ? homeTeam : awayTeam
      return homeWon ? awayTeam : homeTeam
    }

    default: {
      return assertNever(ref, 'TeamRef kind')
    }
  }
}

/** A bracket column as rendered in `BracketView` — the third-place and final matches share one column. */
export type BracketColumnStage = 'r32' | 'r16' | 'qf' | 'sf' | 'final'

const COLUMN_STAGE_ORDER: readonly BracketColumnStage[] = ['r32', 'r16', 'qf', 'sf', 'final']

const COLUMN_MATCH_STAGES: Record<BracketColumnStage, readonly Stage[]> = {
  r32: ['r32'],
  r16: ['r16'],
  qf: ['qf'],
  sf: ['sf'],
  final: ['third', 'final'],
}

/**
 * The bracket column to scroll to when opening the knockout view: the
 * earliest column that still has an unplayed match. Returns null while the
 * group stage is still ongoing (the bracket isn't the focus yet), and
 * 'final' once every knockout match has been decided.
 */
export function currentBracketColumn(results: Record<string, Result>): BracketColumnStage | null {
  if (!GROUP_IDS.every((group) => isGroupComplete(group, results))) return null

  return (
    COLUMN_STAGE_ORDER.find((column) =>
      knockoutMatches.some((m) => COLUMN_MATCH_STAGES[column].includes(m.stage) && results[m.id] == null),
    ) ?? 'final'
  )
}
