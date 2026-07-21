import type { Stage, TeamRef } from '../types/tournament'
import { assertNever } from './assert-never'
import { teamsById } from '../data/teams'

/** Display label for every stage but `group`, which is numbered per-team instead (see `matchStageLabel`). */
export const KNOCKOUT_STAGE_LABEL: Record<Exclude<Stage, 'group'>, string> = {
  final: 'Finale',
  qf: 'Viertelfinale',
  r16: 'Achtelfinale',
  r32: 'Runde der 32',
  sf: 'Halbfinale',
  third: 'Spiel um Platz 3',
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

/** Extract the display number from a match id (e.g. `'M73'` → `'73'`). */
function matchNumber(matchId: string): string {
  return matchId.slice(1)
}

/**
 * Short match-number badge for a card's meta row, for example "Sp. 73".
 * Cards render it so that "Sieger Sp. 73" and the confirm dialog's "Spiel 73" point at something the reader can find.
 */
export function matchNumberLabel(matchId: string): string {
  return `Sp. ${matchNumber(matchId)}`
}

export function teamRefLabel(ref: TeamRef): string {
  switch (ref.kind) {
    case 'team': {
      return teamsById.get(ref.teamId)?.name ?? '?'
    }
    case 'groupRank': {
      return ref.rank === 1 ? `Sieger Gruppe ${ref.group}` : `2. Gruppe ${ref.group}`
    }
    case 'thirdPlace': {
      return 'Bester 3. Platz'
    }
    case 'matchWinner': {
      return `Sieger Sp. ${matchNumber(ref.matchId)}`
    }
    case 'matchLoser': {
      return `Verlierer Sp. ${matchNumber(ref.matchId)}`
    }

    default: {
      return assertNever(ref, 'TeamRef kind')
    }
  }
}
