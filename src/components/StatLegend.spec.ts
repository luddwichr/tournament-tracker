// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import StatLegend from './StatLegend.vue'
import { mount } from '@vue/test-utils'

const columns = [
  { abbr: 'Sp', label: 'Spiele' },
  { abbr: 'TD', label: 'Tordifferenz' },
]

describe('StatLegend', () => {
  it('pairs every abbreviation with its full word', () => {
    const wrapper = mount(StatLegend, { props: { columns } })
    expect(wrapper.findAll('dt').map((dt) => dt.text())).toEqual(['Sp', 'TD'])
    expect(wrapper.findAll('dd').map((dd) => dd.text())).toEqual(['Spiele', 'Tordifferenz'])
  })

  it('opens from a summary, so touch users have a full-size target instead of a hover', () => {
    const wrapper = mount(StatLegend, { props: { columns } })
    const summary = wrapper.get('summary')
    expect(summary.text()).toContain('Was bedeuten die Abkürzungen?')
    // Collapsed by default: the legend must not cost table space until asked for.
    expect(wrapper.get('details').attributes('open')).toBeUndefined()
  })

  it('accepts a caller-supplied summary', () => {
    const wrapper = mount(StatLegend, { props: { columns, summary: 'Spaltenkürzel' } })
    expect(wrapper.get('summary').text()).toContain('Spaltenkürzel')
  })
})
