// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import StatHeaderCell from './StatHeaderCell.vue'
import { mount } from '@vue/test-utils'

describe('StatHeaderCell', () => {
  it('shows the abbreviation but names the trigger with the full label', () => {
    const wrapper = mount(StatHeaderCell, { props: { abbr: 'Sp', label: 'Spiele' } })
    const th = wrapper.get('th')
    expect(th.attributes('scope')).toBe('col')
    const trigger = th.get('button')
    expect(trigger.get('abbr').text()).toBe('Sp')
    expect(trigger.attributes('aria-label')).toBe('Spiele')
  })

  it('wires the trigger to a tooltip popover carrying the full label', () => {
    const wrapper = mount(StatHeaderCell, { props: { abbr: 'TD', label: 'Tordifferenz' } })
    const tooltipId = wrapper.get('button').attributes('popovertarget')
    expect(tooltipId).toBeTruthy()
    const tooltip = wrapper.get(`#${tooltipId}`)
    expect(tooltip.attributes('popover')).toBeDefined()
    expect(tooltip.attributes('role')).toBe('tooltip')
    expect(tooltip.text()).toBe('Tordifferenz')
  })

  it('renders the default slot in place of the abbr when provided', () => {
    const wrapper = mount(StatHeaderCell, {
      props: { label: 'Gelbe Karten' },
      slots: { default: '<svg class="icon" />' },
    })
    expect(wrapper.find('abbr').exists()).toBe(false)
    expect(wrapper.get('button').find('svg.icon').exists()).toBe(true)
    expect(wrapper.get('button').attributes('aria-label')).toBe('Gelbe Karten')
  })
})
