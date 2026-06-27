import { describe, it, expect } from 'vitest'
import { teams } from './teams'
import { squads } from './squads'

describe('squads', () => {
  it('has an entry for every team in teams.ts', () => {
    for (const team of teams) {
      expect(squads).toHaveProperty(team.id)
    }
  })

  it('every squad has exactly 26 players', () => {
    for (const team of teams) {
      expect(squads[team.id] ?? [], `${team.id} squad length`).toHaveLength(26)
    }
  })

  it('every squad has at least 3 goalkeepers', () => {
    for (const team of teams) {
      const gks = (squads[team.id] ?? []).filter((p) => p.position === 'GK')
      expect(gks.length, `${team.id} GK count`).toBeGreaterThanOrEqual(3)
    }
  })

  it('shirt numbers are unique within each squad', () => {
    for (const team of teams) {
      const numbers = (squads[team.id] ?? []).map((p) => p.number)
      expect(new Set(numbers).size, `${team.id} number uniqueness`).toBe(numbers.length)
    }
  })

  it('shirt numbers are in 1-99 range', () => {
    for (const team of teams) {
      for (const player of squads[team.id] ?? []) {
        expect(player.number, `${team.id} #${player.number}`).toBeGreaterThanOrEqual(1)
        expect(player.number, `${team.id} #${player.number}`).toBeLessThanOrEqual(99)
      }
    }
  })

  it('every player has a non-empty name', () => {
    for (const team of teams) {
      for (const player of squads[team.id] ?? []) {
        expect(player.name.trim(), `${team.id} #${player.number}`).not.toBe('')
      }
    }
  })

  it('all positions are valid', () => {
    const VALID = new Set(['GK', 'DF', 'MF', 'FW'])
    for (const team of teams) {
      for (const player of squads[team.id] ?? []) {
        if (player.position !== undefined) {
          expect(VALID.has(player.position!), `${team.id} pos ${player.position}`).toBe(true)
        }
      }
    }
  })
})
