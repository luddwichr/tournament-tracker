// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import MatchScoreButton from './MatchScoreButton.vue'
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

describe('MatchScoreButton', () => {
  it('renders a dash when there is no result', () => {
    const wrapper = mount(MatchScoreButton, { props: { label: 'x' } })
    expect(wrapper.find('.match-score-btn__dash').exists()).toBe(true)
    expect(wrapper.find('.match-score-btn__value').exists()).toBe(false)
  })

  it('renders both goal values when a result is present', () => {
    const wrapper = mount(MatchScoreButton, { props: { label: 'x', result } })
    const values = wrapper.findAll('.match-score-btn__value')
    expect(values.map((v) => v.text())).toEqual(['2', '1'])
    expect(wrapper.find('.match-score-btn__dash').exists()).toBe(false)
  })

  it('applies the label as the button aria-label', () => {
    const wrapper = mount(MatchScoreButton, { props: { label: 'Deutschland – Frankreich: Ergebnis eingeben' } })
    expect(wrapper.get('button').attributes('aria-label')).toBe('Deutschland – Frankreich: Ergebnis eingeben')
  })

  it('emits "openScore" when enabled', async () => {
    const wrapper = mount(MatchScoreButton, { props: { label: 'x' } })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('openScore')).toHaveLength(1)
  })

  it('is disabled and does not emit when disabled', async () => {
    const wrapper = mount(MatchScoreButton, { props: { disabled: true, label: 'x' } })
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('openScore')).toBeUndefined()
  })
})
