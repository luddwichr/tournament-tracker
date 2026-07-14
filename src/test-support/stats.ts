import type { TeamStat } from '../lib/standings'
import { teamsInGroup } from '../data/teams'

export function makeStat(overrides: Partial<TeamStat> = {}): TeamStat {
  const team = teamsInGroup('A')[0] // mex
  if (!team) throw new Error('static teams data has no team in group A')
  return {
    draws: 1,
    fairPlayScore: -1,
    form: ['W', 'W', 'D'],
    goalDiff: 3,
    goalsAgainst: 2,
    goalsFor: 5,
    losses: 0,
    played: 3,
    points: 7,
    redCards: 0,
    team,
    wins: 2,
    yellowCards: 1,
    ...overrides,
  }
}
