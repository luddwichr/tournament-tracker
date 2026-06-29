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
  it('has role="group" labelled "Tore"', () => {
    const wrapper = mountScoreInput()
    const group = wrapper.find('[role="group"]')
    expect(group.exists()).toBe(true)
    expect(group.attributes('aria-label')).toBe('Tore')
  })

  it('renders home and away team names', () => {
    const wrapper = mountScoreInput()
    const names = wrapper.findAll('.score-input__team-name')
    expect(names[0]!.text()).toBe('Deutschland')
    expect(names[1]!.text()).toBe('Frankreich')
  })

  it('renders the ":" separator as aria-hidden', () => {
    const wrapper = mountScoreInput()
    const sep = wrapper.find('.score-input__sep')
    expect(sep.text()).toBe(':')
    expect(sep.attributes('aria-hidden')).toBe('true')
  })

  it('sets correct aria-labels on the home stepper buttons', () => {
    const wrapper = mountScoreInput()
    const buttons = wrapper.findAll('button')
    const dec = buttons.find((b) => b.attributes('aria-label') === 'Tor für Deutschland abziehen')
    const inc = buttons.find((b) => b.attributes('aria-label') === 'Tor für Deutschland hinzufügen')
    expect(dec).toBeDefined()
    expect(inc).toBeDefined()
  })

  it('sets correct aria-labels on the away stepper buttons', () => {
    const wrapper = mountScoreInput()
    const buttons = wrapper.findAll('button')
    const dec = buttons.find((b) => b.attributes('aria-label') === 'Tor für Frankreich abziehen')
    const inc = buttons.find((b) => b.attributes('aria-label') === 'Tor für Frankreich hinzufügen')
    expect(dec).toBeDefined()
    expect(inc).toBeDefined()
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
