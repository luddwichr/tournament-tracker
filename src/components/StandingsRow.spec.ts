// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import StandingsRow from './StandingsRow.vue'
import { makeStat } from '../test-support/stats'
import { mount } from '@vue/test-utils'

describe('StandingsRow', () => {
  it('renders all stat columns in order', () => {
    const wrapper = mount(StandingsRow, { props: { groupDone: false, rank: 1, stat: makeStat() } })
    const [played, wins, draws, losses, goalsFor, goalsAgainst, goalDiff, points] = wrapper.findAll('td')
    expect(played!.text()).toBe('3')
    expect(wins!.text()).toBe('2')
    expect(draws!.text()).toBe('1')
    expect(losses!.text()).toBe('0')
    expect(goalsFor!.text()).toBe('5')
    expect(goalsAgainst!.text()).toBe('2')
    expect(goalDiff!.text()).toBe('+3')
    expect(points!.text()).toBe('7')
  })

  it('renders negative goal difference without a plus sign', () => {
    const wrapper = mount(StandingsRow, { props: { groupDone: false, rank: 1, stat: makeStat({ goalDiff: -2 }) } })
    const [, , , , , , goalDiff] = wrapper.findAll('td')
    expect(goalDiff!.text()).toBe('-2')
  })

  it('shows "qualified" status class for rank ≤ 2 when group is done', () => {
    const wrapper = mount(StandingsRow, { props: { groupDone: true, rank: 1, stat: makeStat() } })
    expect(wrapper.find('tr').classes()).toContain('standings-row--qualified')
  })

  it('shows "third" status class for rank 3 when group is done', () => {
    const wrapper = mount(StandingsRow, {
      props: { groupDone: true, rank: 3, stat: makeStat() },
    })
    expect(wrapper.find('tr').classes()).toContain('standings-row--third')
  })

  it('shows "eliminated" status class for rank 4 when group is done', () => {
    const wrapper = mount(StandingsRow, { props: { groupDone: true, rank: 4, stat: makeStat() } })
    expect(wrapper.find('tr').classes()).toContain('standings-row--eliminated')
  })

  it('shows "safe" status class for rank ≤ 2 when group is not done (played > 0)', () => {
    const wrapper = mount(StandingsRow, { props: { groupDone: false, rank: 2, stat: makeStat({ played: 2 }) } })
    expect(wrapper.find('tr').classes()).toContain('standings-row--safe')
  })

  it('shows "potential" status class for rank 3 when group is not done', () => {
    const wrapper = mount(StandingsRow, { props: { groupDone: false, rank: 3, stat: makeStat({ played: 2 }) } })
    expect(wrapper.find('tr').classes()).toContain('standings-row--potential')
  })

  it('shows "danger" status class for rank 4 when group is not done', () => {
    const wrapper = mount(StandingsRow, { props: { groupDone: false, rank: 4, stat: makeStat({ played: 2 }) } })
    expect(wrapper.find('tr').classes()).toContain('standings-row--danger')
  })

  it('shows "none" status (no strip) when played === 0', () => {
    const wrapper = mount(StandingsRow, {
      props: { groupDone: false, rank: 1, stat: makeStat({ form: [], played: 0 }) },
    })
    const trClass = wrapper.find('tr').classes().join(' ')
    expect(trClass).not.toContain('standings-row--qualified')
    expect(trClass).not.toContain('standings-row--safe')
    expect(trClass).not.toContain('standings-row--danger')
  })

  it('includes a visually-hidden rank and status label when played > 0', () => {
    const wrapper = mount(StandingsRow, { props: { groupDone: true, rank: 1, stat: makeStat() } })
    expect(wrapper.find('.visually-hidden').text()).toBe('Platz 1, qualifiziert')
  })

  it('still names the rank in the visually-hidden label when played === 0', () => {
    const wrapper = mount(StandingsRow, {
      props: { groupDone: false, rank: 4, stat: makeStat({ form: [], played: 0 }) },
    })
    expect(wrapper.find('.visually-hidden').text()).toBe('Platz 4')
  })
})
