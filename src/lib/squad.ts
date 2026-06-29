import type { Player } from '../types/tournament'

type Position = NonNullable<Player['position']>

export const POSITION_LABEL: Record<Position, string> = {
  GK: 'Torwart',
  DF: 'Abwehr',
  MF: 'Mittelfeld',
  FW: 'Sturm',
}

const POSITION_ORDER: Record<Position, number> = { GK: 0, DF: 1, MF: 2, FW: 3 }

export function sortBySquadPosition(players: Player[]): Player[] {
  return players.toSorted((a, b) => {
    const pa = a.position != null ? POSITION_ORDER[a.position] : 99
    const pb = b.position != null ? POSITION_ORDER[b.position] : 99
    return pa !== pb ? pa - pb : a.number - b.number
  })
}
