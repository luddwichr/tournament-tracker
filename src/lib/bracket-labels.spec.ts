import { describe, it, expect } from 'vitest'
import { teamRefLabel } from './bracket-labels'

describe('teamRefLabel', () => {
  it("'team' — returns the team's German display name", () => {
    expect(teamRefLabel({ kind: 'team', teamId: 'ger' })).toBe('Deutschland')
  })

  it("'team' — returns '?' for an unknown teamId", () => {
    expect(teamRefLabel({ kind: 'team', teamId: 'zzz' })).toBe('?')
  })

  it("'groupRank' rank 1 — 'Sieger Gruppe X'", () => {
    expect(teamRefLabel({ kind: 'groupRank', group: 'A', rank: 1 })).toBe('Sieger Gruppe A')
    expect(teamRefLabel({ kind: 'groupRank', group: 'L', rank: 1 })).toBe('Sieger Gruppe L')
  })

  it("'groupRank' rank 2 — '2. Gruppe X'", () => {
    expect(teamRefLabel({ kind: 'groupRank', group: 'B', rank: 2 })).toBe('2. Gruppe B')
    expect(teamRefLabel({ kind: 'groupRank', group: 'K', rank: 2 })).toBe('2. Gruppe K')
  })

  it("'thirdPlace' — 'Bester 3. Platz' for any slot", () => {
    expect(teamRefLabel({ kind: 'thirdPlace', slot: 1 })).toBe('Bester 3. Platz')
    expect(teamRefLabel({ kind: 'thirdPlace', slot: 8 })).toBe('Bester 3. Platz')
  })

  it("'matchWinner' — 'Sieger Sp. N' with match number", () => {
    expect(teamRefLabel({ kind: 'matchWinner', matchId: 'M73' })).toBe('Sieger Sp. 73')
    expect(teamRefLabel({ kind: 'matchWinner', matchId: 'M104' })).toBe('Sieger Sp. 104')
  })

  it("'matchLoser' — 'Verlierer Sp. N' with match number", () => {
    expect(teamRefLabel({ kind: 'matchLoser', matchId: 'M101' })).toBe('Verlierer Sp. 101')
    expect(teamRefLabel({ kind: 'matchLoser', matchId: 'M102' })).toBe('Verlierer Sp. 102')
  })
})
