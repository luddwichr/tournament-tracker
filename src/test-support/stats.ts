import type { TeamStat } from '../lib/standings'
import { teamsInGroup } from '../data/teams'

export function makeStat(overrides: Partial<TeamStat> = {}): TeamStat {
  const team = teamsInGroup('A')[0]! // mex
  return {
    team,
    played: 3,
    wins: 2,
    draws: 1,
    losses: 0,
    goalsFor: 5,
    goalsAgainst: 2,
    goalDiff: 3,
    points: 7,
    yellowCards: 1,
    redCards: 0,
    fairPlayScore: -1,
    form: ['W', 'W', 'D'],
    ...overrides,
  }
}
