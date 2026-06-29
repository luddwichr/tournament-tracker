import type { Team } from '../types/tournament'

let counter = 1

export function makeTeam(overrides: Partial<Team> = {}): Team {
  const n = counter++
  return {
    id: `team-${n}`,
    name: `Team ${n}`,
    flagCode: 'xx',
    group: 'A',
    fifaRanking: n,
    ...overrides,
  }
}
