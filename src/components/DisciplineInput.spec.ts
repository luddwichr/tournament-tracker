// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DisciplineInput from './DisciplineInput.vue'

function mountDisciplineInput(props = { awayRed: 0, awayYellow: 0, homeRed: 0, homeYellow: 0 }) {
  return mount(DisciplineInput, { props })
}

describe('DisciplineInput', () => {
  it('renders a fieldset with legend "Karten"', () => {
    const wrapper = mountDisciplineInput()
    expect(wrapper.find('fieldset').exists()).toBe(true)
    expect(wrapper.find('legend').text()).toBe('Karten')
  })

  it('renders two role="group" sections (home and away)', () => {
    const wrapper = mountDisciplineInput()
    const groups = wrapper.findAll('[role="group"]')
    expect(groups).toHaveLength(2)
  })

  it('labels the home group "Heim" via aria-label', () => {
    const wrapper = mountDisciplineInput()
    const homeGroup = wrapper.find('[aria-label="Heim"]')
    expect(homeGroup.exists()).toBe(true)
  })

  it('labels the away group "Gast" via aria-label', () => {
    const wrapper = mountDisciplineInput()
    const awayGroup = wrapper.find('[aria-label="Gast"]')
    expect(awayGroup.exists()).toBe(true)
  })

  it.each([
    ['update:homeYellow', 'Gelbe Karte Heim hinzufügen'],
    ['update:homeRed', 'Rote Karte Heim hinzufügen'],
    ['update:awayYellow', 'Gelbe Karte Gast hinzufügen'],
    ['update:awayRed', 'Rote Karte Gast hinzufügen'],
  ] as const)('emits %s when the matching increment button is clicked', async (event, label) => {
    const wrapper = mountDisciplineInput()
    const btn = wrapper.findAll('button').find((b) => b.attributes('aria-label') === label)
    expect(btn).toBeDefined()
    await btn!.trigger('click')
    expect(wrapper.emitted(event)).toBeTruthy()
    expect(wrapper.emitted(event)![0]).toEqual([1])
  })

  it('decrement does not go below 0 (min enforcement)', async () => {
    const wrapper = mountDisciplineInput()
    const btn = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Gelbe Karte Heim abziehen')
    expect(btn).toBeDefined()
    await btn!.trigger('click')
    // Stepper enforces min=0; defineModel skips emitting unchanged values, so
    // no update event should fire at all (value stays at 0).
    expect(wrapper.emitted('update:homeYellow')).toBeUndefined()
  })
})
