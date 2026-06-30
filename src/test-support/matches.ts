import type { MatchSlot } from '../types/tournament'

let counter = 1

export function makeMatch(overrides: Partial<MatchSlot> = {}): MatchSlot {
  const n = counter++
  return {
    id: `M${String(n).padStart(2, '0')}`,
    stage: 'r32',
    kickoff: '2026-07-01T18:00:00+02:00',
    homeRef: { kind: 'matchWinner', matchId: 'M1' },
    awayRef: { kind: 'matchWinner', matchId: 'M2' },
    ...overrides,
  }
}
