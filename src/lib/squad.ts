import type { Player } from '../types/tournament'

export const POSITION_LABEL = {
  GK: 'Torwart',
  DF: 'Abwehr',
  MF: 'Mittelfeld',
  FW: 'Sturm',
} as const

const POSITION_ORDER: Record<Player['position'], number> = { GK: 0, DF: 1, MF: 2, FW: 3 }

export function sortBySquadPosition(players: readonly Player[]): readonly Player[] {
  return players.toSorted((a, b) => {
    const pa = POSITION_ORDER[a.position]
    const pb = POSITION_ORDER[b.position]
    return pa !== pb ? pa - pb : a.number - b.number
  })
}
