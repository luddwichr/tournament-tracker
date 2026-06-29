import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StandingsRow from './StandingsRow.vue'
import type { TeamStat } from '../lib/standings'
import { teamsInGroup } from '../data/teams'

function makeStat(overrides: Partial<TeamStat> = {}): TeamStat {
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

describe('StandingsRow', () => {
  it('renders all stat columns', () => {
    const wrapper = mount(StandingsRow, { props: { stat: makeStat(), rank: 1, groupDone: false } })
    expect(wrapper.text()).toContain('5') // goalsFor
    expect(wrapper.text()).toContain('2') // goalsAgainst
    expect(wrapper.text()).toContain('7') // points
  })

  it('renders +3 with plus sign for positive goal difference', () => {
    const wrapper = mount(StandingsRow, { props: { stat: makeStat({ goalDiff: 3 }), rank: 1, groupDone: false } })
    expect(wrapper.text()).toContain('+3')
  })

  it('shows "qualified" status class for rank ≤ 2 when group is done', () => {
    const wrapper = mount(StandingsRow, { props: { stat: makeStat(), rank: 1, groupDone: true } })
    expect(wrapper.find('tr').classes()).toContain('standings-row--qualified')
  })

  it('shows "third" status class for rank 3 when group is done', () => {
    const wrapper = mount(StandingsRow, {
      props: { stat: makeStat(), rank: 3, groupDone: true },
    })
    expect(wrapper.find('tr').classes()).toContain('standings-row--third')
  })

  it('shows "eliminated" status class for rank 4 when group is done', () => {
    const wrapper = mount(StandingsRow, { props: { stat: makeStat(), rank: 4, groupDone: true } })
    expect(wrapper.find('tr').classes()).toContain('standings-row--eliminated')
  })

  it('shows "safe" status class for rank ≤ 2 when group is not done (played > 0)', () => {
    const wrapper = mount(StandingsRow, { props: { stat: makeStat({ played: 2 }), rank: 2, groupDone: false } })
    expect(wrapper.find('tr').classes()).toContain('standings-row--safe')
  })

  it('shows "potential" status class for rank 3 when group is not done', () => {
    const wrapper = mount(StandingsRow, { props: { stat: makeStat({ played: 2 }), rank: 3, groupDone: false } })
    expect(wrapper.find('tr').classes()).toContain('standings-row--potential')
  })

  it('shows "danger" status class for rank 4 when group is not done', () => {
    const wrapper = mount(StandingsRow, { props: { stat: makeStat({ played: 2 }), rank: 4, groupDone: false } })
    expect(wrapper.find('tr').classes()).toContain('standings-row--danger')
  })

  it('shows "none" status (no strip) when played === 0', () => {
    const wrapper = mount(StandingsRow, {
      props: { stat: makeStat({ played: 0, form: [] }), rank: 1, groupDone: false },
    })
    const trClass = wrapper.find('tr').classes().join(' ')
    expect(trClass).not.toContain('standings-row--qualified')
    expect(trClass).not.toContain('standings-row--safe')
    expect(trClass).not.toContain('standings-row--danger')
  })

  it('includes a visually-hidden status label when played > 0', () => {
    const wrapper = mount(StandingsRow, { props: { stat: makeStat(), rank: 1, groupDone: true } })
    expect(wrapper.find('.visually-hidden').text()).toBe('(qualifiziert)')
  })
})
