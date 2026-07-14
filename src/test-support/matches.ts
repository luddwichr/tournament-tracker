import type { GroupMatchSlot, KnockoutMatchSlot, MatchSlot } from '../types/tournament'

let counter = 1

// Overloaded so a `stage: 'group'` override (which requires a concrete
// `group` and team-only refs) is checked against `GroupMatchSlot`, while
// every other call keeps the knockout-shaped default — `Partial<MatchSlot>`
// alone would flatten the discriminated union and silently accept
// mismatched `stage`/`group`/`homeRef` combinations.
export function makeMatch(overrides?: Partial<KnockoutMatchSlot>): KnockoutMatchSlot
export function makeMatch(overrides: Partial<GroupMatchSlot>): GroupMatchSlot
export function makeMatch(overrides: Partial<MatchSlot> = {}): MatchSlot {
  const n = counter++
  const base = {
    awayRef: { kind: 'matchWinner' as const, matchId: 'M2' },
    homeRef: { kind: 'matchWinner' as const, matchId: 'M1' },
    id: `M${String(n).padStart(2, '0')}`,
    kickoff: '2026-07-01T18:00:00+02:00',
    stage: 'r32' as const,
  }
  return { ...base, ...overrides } as MatchSlot
}
