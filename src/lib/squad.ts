import type { Player } from '../types/tournament'

export const POSITION_LABEL = {
  DF: 'Abwehr',
  FW: 'Sturm',
  GK: 'Torwart',
  MF: 'Mittelfeld',
} as const

const POSITION_ORDER: Record<Player['position'], number> = { DF: 1, FW: 3, GK: 0, MF: 2 }

export function sortBySquadPosition(players: readonly Player[]): readonly Player[] {
  return players.toSorted((a, b) => {
    const pa = POSITION_ORDER[a.position]
    const pb = POSITION_ORDER[b.position]
    return pa !== pb ? pa - pb : a.number - b.number
  })
}
