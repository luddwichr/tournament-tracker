/**
 * Resolve TeamRefs for knockout matches.
 *
 * `resolveTeamRef` walks the reference chain — groupRank → thirdPlace →
 * matchWinner/matchLoser — returning null at any step that is not yet
 * determinable from current results.
 *
 * A draw result in a knockout match leaves winner/loser unresolvable — users
 * must enter the decisive score (e.g. the AET score when extra time settled it).
 */

import type { MatchSlot, TeamRef, Team, Result } from '../types/tournament'
import { fixtures } from '../data/fixtures-2026'
import { teamsById } from '../data/teams'
import { computeGroupStandings, isGroupComplete } from './standings'
import { resolveThirdPlaceSlot } from './third-place'

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
      const match = fixtures.find((m) => m.id === ref.matchId)
      if (!match) return null
      const matchResult = results[ref.matchId]
      if (!matchResult) return null

      const homeTeam = resolveTeamRef(match.homeRef, results)
      const awayTeam = resolveTeamRef(match.awayRef, results)
      if (!homeTeam || !awayTeam) return null

      if (matchResult.homeGoals === matchResult.awayGoals) return null

      const homeWon = matchResult.homeGoals > matchResult.awayGoals
      if (ref.kind === 'matchWinner') return homeWon ? homeTeam : awayTeam
      return homeWon ? awayTeam : homeTeam
    }

    default: {
      const _exhaustive: never = ref
      throw new Error(`Unhandled TeamRef kind: ${JSON.stringify(_exhaustive)}`)
    }
  }
}

/**
 * Return true when both participants of `match` are resolved and result entry
 * should be permitted. Always true for group-stage matches (refs are concrete
 * teams). For knockout matches, both upstream refs must resolve.
 */
export function canEnterResult(match: MatchSlot, results: Record<string, Result>): boolean {
  return resolveTeamRef(match.homeRef, results) !== null && resolveTeamRef(match.awayRef, results) !== null
}
