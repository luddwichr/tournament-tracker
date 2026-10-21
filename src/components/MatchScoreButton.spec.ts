// @vitest-environment jsdom
import MatchScoreButton, { type ScoreLabel } from './MatchScoreButton.vue'
import { describe, expect, it } from 'vitest'
import type { Result } from '../types/tournament'
import { mount } from '@vue/test-utils'

const result: Result = {
  awayGoals: 1,
  awayRed: 0,
  awayYellow: 0,
  homeGoals: 2,
  homeRed: 0,
  homeYellow: 0,
  matchId: 'M01',
}

const label: ScoreLabel = {
  afterAway: ' Frankreich – Ergebnis bearbeiten',
  beforeHome: 'Deutschland ',
  betweenGoals: ' : ',
}

const emptyLabel: ScoreLabel = {
  afterAway: '',
  beforeHome: 'Deutschland – Frankreich: Ergebnis eingeben',
  betweenGoals: '',
}

describe('MatchScoreButton', () => {
  it('renders a dash when there is no result', () => {
    const wrapper = mount(MatchScoreButton, { props: { label } })
    expect(wrapper.find('.match-score-btn__dash').exists()).toBe(true)
    expect(wrapper.find('.match-score-btn__value').exists()).toBe(false)
  })

  it('renders both goal values when a result is present', () => {
    const wrapper = mount(MatchScoreButton, { props: { label, result } })
    const values = wrapper.findAll('.match-score-btn__value')
    expect(values.map((v) => v.text())).toEqual(['2', '1'])
    expect(wrapper.find('.match-score-btn__dash').exists()).toBe(false)
  })

  it('renders the folded score and an aria-hidden i.E. badge for a shootout result', () => {
    const shootoutResult: Result = { ...result, awayGoals: 1, awayShootoutGoals: 2, homeGoals: 1, homeShootoutGoals: 4 }
    const wrapper = mount(MatchScoreButton, { props: { label, result: shootoutResult } })
    const values = wrapper.findAll('.match-score-btn__value')
    expect(values.map((v) => v.text())).toEqual(['5', '3'])
    const badge = wrapper.find('.match-score-btn__shootout')
    expect(badge.text()).toBe('i.E.')
    expect(badge.attributes('aria-hidden')).toBe('true')
  })

  it('renders no i.E. badge for a result without shootout', () => {
    const wrapper = mount(MatchScoreButton, { props: { label, result } })
    expect(wrapper.find('.match-score-btn__shootout').exists()).toBe(false)
  })

  it('names the button from its content instead of an aria-label', () => {
    const wrapper = mount(MatchScoreButton, { props: { label, result } })
    expect(wrapper.get('button').attributes('aria-label')).toBeUndefined()
  })

  it('places the hidden label parts around the visible goals', () => {
    const wrapper = mount(MatchScoreButton, { props: { label, result } })
    const parts = [...wrapper.get('.match-score-btn__pill').element.children].map((part) => [
      part.className,
      part.textContent,
    ])
    expect(parts).toEqual([
      ['visually-hidden', 'Deutschland '],
      ['match-score-btn__value', '2'],
      ['visually-hidden', ' : '],
      ['match-score-btn__value', '1'],
      ['visually-hidden', ' Frankreich – Ergebnis bearbeiten'],
    ])
  })

  it('speaks only the hidden label while there is no result, since the dash is aria-hidden', () => {
    const wrapper = mount(MatchScoreButton, { props: { label: emptyLabel } })
    expect(wrapper.get('.visually-hidden').text()).toBe('Deutschland – Frankreich: Ergebnis eingeben')
    expect(wrapper.get('.match-score-btn__dash').attributes('aria-hidden')).toBe('true')
  })

  it('emits "openScore" when enabled', async () => {
    const wrapper = mount(MatchScoreButton, { props: { label } })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('openScore')).toHaveLength(1)
  })

  it('is disabled and does not emit when disabled', async () => {
    const wrapper = mount(MatchScoreButton, { props: { disabled: true, label } })
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('openScore')).toBeUndefined()
  })
})
