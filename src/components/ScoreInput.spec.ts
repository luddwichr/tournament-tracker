// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import ScoreInput from './ScoreInput.vue'
import { findButtonByLabel } from '../test-support/find-button'
import { makeTeam } from '../test-support/teams'
import { mount } from '@vue/test-utils'

const homeTeam = makeTeam({ id: 'ger', name: 'Deutschland' })
const awayTeam = makeTeam({ id: 'fra', name: 'Frankreich' })

function mountScoreInput(home = 0, away = 0) {
  return mount(ScoreInput, {
    props: { away, awayTeam, home, homeTeam },
  })
}

describe('ScoreInput', () => {
  it('renders a fieldset with legend "⚽ Tore"', () => {
    const wrapper = mountScoreInput()
    expect(wrapper.find('fieldset').exists()).toBe(true)
    expect(wrapper.find('legend').text()).toBe('⚽ Tore')
  })

  it.each([
    'Tor für Deutschland abziehen',
    'Tor für Deutschland hinzufügen',
    'Tor für Frankreich abziehen',
    'Tor für Frankreich hinzufügen',
  ])('sets a stepper button with aria-label %j', (label) => {
    const wrapper = mountScoreInput()
    const buttons = wrapper.findAll('button')
    expect(buttons.some((b) => b.attributes('aria-label') === label)).toBe(true)
  })

  it('renders a custom legend, emoji and goal noun (shootout variant)', () => {
    const wrapper = mount(ScoreInput, {
      props: {
        away: 0,
        awayTeam,
        emoji: '🎯',
        goalNoun: 'Elfmetertor',
        home: 0,
        homeTeam,
        legend: 'Elfmeterschießen',
      },
    })
    expect(wrapper.find('legend').text()).toBe('🎯 Elfmeterschießen')
    const buttons = wrapper.findAll('button')
    expect(buttons.some((b) => b.attributes('aria-label') === 'Elfmetertor für Deutschland hinzufügen')).toBe(true)
  })

  it('renders the ":" separator as aria-hidden', () => {
    const wrapper = mountScoreInput()
    const sep = wrapper.find('.score-input__sep')
    expect(sep.text()).toBe(':')
    expect(sep.attributes('aria-hidden')).toBe('true')
  })

  it('emits update:home when home increment is clicked', async () => {
    const wrapper = mountScoreInput(1, 0)
    await findButtonByLabel(wrapper, 'Tor für Deutschland hinzufügen').trigger('click')
    expect(wrapper.emitted('update:home')).toEqual([[2]])
  })

  it('emits update:away when away increment is clicked', async () => {
    const wrapper = mountScoreInput(0, 2)
    await findButtonByLabel(wrapper, 'Tor für Frankreich hinzufügen').trigger('click')
    expect(wrapper.emitted('update:away')).toEqual([[3]])
  })
})
