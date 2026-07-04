// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ScoreInput from './ScoreInput.vue'
import { makeTeam } from '../test-support/teams'

const homeTeam = makeTeam({ id: 'ger', name: 'Deutschland' })
const awayTeam = makeTeam({ id: 'fra', name: 'Frankreich' })

function mountScoreInput(home = 0, away = 0) {
  return mount(ScoreInput, {
    props: { homeTeam, awayTeam, home, away },
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

  it('renders the ":" separator as aria-hidden', () => {
    const wrapper = mountScoreInput()
    const sep = wrapper.find('.score-input__sep')
    expect(sep.text()).toBe(':')
    expect(sep.attributes('aria-hidden')).toBe('true')
  })

  it('emits update:home when home increment is clicked', async () => {
    const wrapper = mountScoreInput(1, 0)
    const inc = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Tor für Deutschland hinzufügen')
    await inc!.trigger('click')
    expect(wrapper.emitted('update:home')).toEqual([[2]])
  })

  it('emits update:away when away increment is clicked', async () => {
    const wrapper = mountScoreInput(0, 2)
    const inc = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Tor für Frankreich hinzufügen')
    await inc!.trigger('click')
    expect(wrapper.emitted('update:away')).toEqual([[3]])
  })
})
