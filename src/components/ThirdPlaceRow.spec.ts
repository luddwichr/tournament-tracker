// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ThirdPlaceRow from './ThirdPlaceRow.vue'
import { makeStat } from '../test-support/stats'

describe('ThirdPlaceRow', () => {
  it('renders the tiebreaker columns in breaking order: points, GD, goals, fair-play, FIFA rank', () => {
    const wrapper = mount(ThirdPlaceRow, { props: { stat: makeStat(), rank: 1, final: false } })
    const [points, goalDiff, goalsFor, fairPlay, fifa] = wrapper.findAll('td')
    expect(points!.text()).toBe('7')
    expect(goalDiff!.text()).toBe('+3')
    expect(goalsFor!.text()).toBe('5')
    expect(fairPlay!.text()).toBe('-1')
    expect(fifa!.text()).toBe(String(makeStat().team.fifaRanking))
    expect(wrapper.find('.third-place-row__group').text()).toBe('A')
  })

  it('renders negative goal difference without a plus sign', () => {
    const wrapper = mount(ThirdPlaceRow, { props: { stat: makeStat({ goalDiff: -2 }), rank: 1, final: false } })
    const goalDiff = wrapper.findAll('td')[1]!
    expect(goalDiff.text()).toBe('-2')
  })

  it('shows "safe" status for rank <= 8 while the group stage is not final', () => {
    const wrapper = mount(ThirdPlaceRow, { props: { stat: makeStat(), rank: 8, final: false } })
    expect(wrapper.find('tr').classes()).toContain('third-place-row--safe')
  })

  it('shows "danger" status for rank > 8 while the group stage is not final', () => {
    const wrapper = mount(ThirdPlaceRow, { props: { stat: makeStat(), rank: 9, final: false } })
    expect(wrapper.find('tr').classes()).toContain('third-place-row--danger')
  })

  it('shows "qualified" status for rank <= 8 once final', () => {
    const wrapper = mount(ThirdPlaceRow, { props: { stat: makeStat(), rank: 8, final: true } })
    expect(wrapper.find('tr').classes()).toContain('third-place-row--qualified')
  })

  it('shows "eliminated" status for rank > 8 once final', () => {
    const wrapper = mount(ThirdPlaceRow, { props: { stat: makeStat(), rank: 9, final: true } })
    expect(wrapper.find('tr').classes()).toContain('third-place-row--eliminated')
  })

  it('shows "none" status (no strip) when played === 0', () => {
    const wrapper = mount(ThirdPlaceRow, {
      props: { stat: makeStat({ played: 0, form: [] }), rank: 1, final: false },
    })
    const trClass = wrapper.find('tr').classes().join(' ')
    expect(trClass).not.toContain('third-place-row--safe')
    expect(trClass).not.toContain('third-place-row--danger')
  })

  it('marks the row right after the qualifying cutoff (rank 9)', () => {
    const wrapper = mount(ThirdPlaceRow, { props: { stat: makeStat(), rank: 9, final: false } })
    expect(wrapper.find('tr').classes()).toContain('third-place-row--cutoff')
  })

  it('does not mark rank 8 as the cutoff row', () => {
    const wrapper = mount(ThirdPlaceRow, { props: { stat: makeStat(), rank: 8, final: false } })
    expect(wrapper.find('tr').classes()).not.toContain('third-place-row--cutoff')
  })

  it('includes a visually-hidden status label when played > 0', () => {
    const wrapper = mount(ThirdPlaceRow, { props: { stat: makeStat(), rank: 1, final: true } })
    expect(wrapper.find('.visually-hidden').text()).toBe('(qualifiziert)')
  })
})
