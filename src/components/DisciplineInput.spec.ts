import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DisciplineInput from './DisciplineInput.vue'

function mountDisciplineInput(props = { homeYellow: 0, homeRed: 0, awayYellow: 0, awayRed: 0 }) {
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

  it('has aria-labelledby pointing at the home label', () => {
    const wrapper = mountDisciplineInput()
    const homeGroup = wrapper.find('[aria-labelledby="discipline-home-label"]')
    expect(homeGroup.exists()).toBe(true)
    expect(wrapper.find('#discipline-home-label').text()).toBe('Heim')
  })

  it('has aria-labelledby pointing at the away label', () => {
    const wrapper = mountDisciplineInput()
    const awayGroup = wrapper.find('[aria-labelledby="discipline-away-label"]')
    expect(awayGroup.exists()).toBe(true)
    expect(wrapper.find('#discipline-away-label').text()).toBe('Gast')
  })

  it('emits update:homeYellow when the home yellow increment button is clicked', async () => {
    const wrapper = mountDisciplineInput()
    const btn = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Gelbe Karte Heim hinzufügen')
    expect(btn).toBeDefined()
    await btn!.trigger('click')
    expect(wrapper.emitted('update:homeYellow')).toBeTruthy()
    expect(wrapper.emitted('update:homeYellow')![0]).toEqual([1])
  })

  it('emits update:homeRed when the home red increment button is clicked', async () => {
    const wrapper = mountDisciplineInput()
    const btn = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Rote Karte Heim hinzufügen')
    expect(btn).toBeDefined()
    await btn!.trigger('click')
    expect(wrapper.emitted('update:homeRed')).toBeTruthy()
    expect(wrapper.emitted('update:homeRed')![0]).toEqual([1])
  })

  it('emits update:awayYellow when the away yellow increment button is clicked', async () => {
    const wrapper = mountDisciplineInput()
    const btn = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Gelbe Karte Gast hinzufügen')
    expect(btn).toBeDefined()
    await btn!.trigger('click')
    expect(wrapper.emitted('update:awayYellow')).toBeTruthy()
    expect(wrapper.emitted('update:awayYellow')![0]).toEqual([1])
  })

  it('emits update:awayRed when the away red increment button is clicked', async () => {
    const wrapper = mountDisciplineInput()
    const btn = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Rote Karte Gast hinzufügen')
    expect(btn).toBeDefined()
    await btn!.trigger('click')
    expect(wrapper.emitted('update:awayRed')).toBeTruthy()
    expect(wrapper.emitted('update:awayRed')![0]).toEqual([1])
  })

  it('decrement does not go below 0 (min enforcement)', async () => {
    const wrapper = mountDisciplineInput()
    const btn = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Gelbe Karte Heim abziehen')
    expect(btn).toBeDefined()
    await btn!.trigger('click')
    // Stepper enforces min=0; no update event should fire (value stays at 0)
    const emitted = wrapper.emitted('update:homeYellow')
    if (emitted) {
      expect(emitted[0]).toEqual([0]) // clamped to 0
    }
  })
})
