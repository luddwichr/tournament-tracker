import type { TeamRef } from '../types/tournament'
import { assertNever } from './assert-never'
import { teamsById } from '../data/teams'

/** Extract the display number from a match id (e.g. `'M73'` → `'73'`). */
function matchNumber(matchId: string): string {
  return matchId.slice(1)
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
