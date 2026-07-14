// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TeamStats from './TeamStats.vue'
import type { TeamOverallStats } from '../lib/team-schedule'

function makeStats(overrides: Partial<TeamOverallStats> = {}): TeamOverallStats {
  return {
    draws: 1,
    goalsAgainst: 1,
    goalsFor: 5,
    losses: 0,
    played: 3,
    redCards: 1,
    wins: 2,
    yellowCards: 4,
    ...overrides,
  }
}

describe('TeamStats', () => {
  it('renders played, wins, draws, losses, goals for/against, and cards in order', () => {
    const wrapper = mount(TeamStats, { props: { stats: makeStats() } })
    const cells = wrapper.findAll('.team-stats__num').map((td) => td.text())
    expect(cells).toEqual(['3', '2', '1', '0', '5', '1', '4', '1'])
  })

  it('has a visually-hidden caption', () => {
    const wrapper = mount(TeamStats, { props: { stats: makeStats() } })
    expect(wrapper.find('caption').text()).toBe('Statistik')
  })
})
