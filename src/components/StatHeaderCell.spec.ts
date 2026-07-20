// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import StatHeaderCell from './StatHeaderCell.vue'
import { mount } from '@vue/test-utils'

describe('StatHeaderCell', () => {
  it('renders an abbr with the label as its title plus a visually-hidden full label', () => {
    const wrapper = mount(StatHeaderCell, { props: { abbr: 'Sp', label: 'Spiele' } })
    const th = wrapper.get('th')
    expect(th.attributes('scope')).toBe('col')
    const abbr = th.get('abbr')
    expect(abbr.text()).toBe('Sp')
    expect(abbr.attributes('title')).toBe('Spiele')
    expect(abbr.element.nextElementSibling?.textContent).toBe('Spiele')
    expect(abbr.element.nextElementSibling?.classList.contains('visually-hidden')).toBe(true)
  })

  it('renders the default slot in place of the abbr when provided', () => {
    const wrapper = mount(StatHeaderCell, {
      props: { label: 'Gelbe Karten' },
      slots: { default: '<svg class="icon" />' },
    })
    expect(wrapper.find('abbr').exists()).toBe(false)
    expect(wrapper.find('svg.icon').exists()).toBe(true)
    expect(wrapper.get('.visually-hidden').text()).toBe('Gelbe Karten')
  })

  it('stays non-interactive so the columns can keep their phone-sized widths', () => {
    const wrapper = mount(StatHeaderCell, { props: { abbr: 'TD', label: 'Tordifferenz' } })
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
