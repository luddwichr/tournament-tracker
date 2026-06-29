import type { TeamRef } from '../types/tournament'
import { teamsById } from '../data/teams'

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
      const n = ref.matchId.replace('M', '')
      return `Sieger Sp. ${n}`
    }
    case 'matchLoser': {
      const n = ref.matchId.replace('M', '')
      return `Verlierer Sp. ${n}`
    }

    default: {
      const _exhaustive: never = ref
      throw new Error(`Unhandled TeamRef kind: ${JSON.stringify(_exhaustive)}`)
    }
  }
}
