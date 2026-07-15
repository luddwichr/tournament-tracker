// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import DisciplineInput from './DisciplineInput.vue'
import { makeTeam } from '../test-support/teams'
import { mount } from '@vue/test-utils'

const homeTeam = makeTeam({ name: 'Deutschland' })
const awayTeam = makeTeam({ name: 'Frankreich' })

function mountDisciplineInput(models = { awayRed: 0, awayYellow: 0, homeRed: 0, homeYellow: 0 }) {
  return mount(DisciplineInput, { props: { ...models, awayTeam, homeTeam } })
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

  it('shows a visible side label per team and names each group by it', () => {
    const wrapper = mountDisciplineInput()
    const labels = wrapper.findAll('.discipline-input__side')
    expect(labels.map((l) => l.text())).toEqual(['Deutschland', 'Frankreich'])
    // Each group is named by its visible side label, not an abstract aria-label.
    for (const label of labels) {
      const group = wrapper.find(`[aria-labelledby="${label.attributes('id')}"]`)
      expect(group.exists()).toBe(true)
    }
  })

  it.each([
    ['update:homeYellow', 'Gelbe Karte für Deutschland hinzufügen'],
    ['update:homeRed', 'Rote Karte für Deutschland hinzufügen'],
    ['update:awayYellow', 'Gelbe Karte für Frankreich hinzufügen'],
    ['update:awayRed', 'Rote Karte für Frankreich hinzufügen'],
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
    const btn = wrapper
      .findAll('button')
      .find((b) => b.attributes('aria-label') === 'Gelbe Karte für Deutschland abziehen')
    expect(btn).toBeDefined()
    await btn!.trigger('click')
    // Stepper enforces min=0; defineModel skips emitting unchanged values, so
    // no update event should fire at all (value stays at 0).
    expect(wrapper.emitted('update:homeYellow')).toBeUndefined()
  })
})
