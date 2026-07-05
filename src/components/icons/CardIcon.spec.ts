// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CardIcon from './CardIcon.vue'

describe('CardIcon', () => {
  it('renders no count when none is given', () => {
    expect(
      mount(CardIcon, { props: { color: 'yellow' } })
        .find('.card-icon__count')
        .exists(),
    ).toBe(false)
  })

  it('renders the count as text overlaid on the icon', () => {
    const wrapper = mount(CardIcon, { props: { color: 'red', count: 2 } })
    expect(wrapper.get('.card-icon__count').text()).toBe('2')
  })

  it('gives the count text sufficient contrast against each card color', () => {
    const yellow = mount(CardIcon, { props: { color: 'yellow', count: 1 } })
    expect(yellow.get('.card-icon__count').attributes('style')).toContain('color: rgb(26, 26, 26)')

    const red = mount(CardIcon, { props: { color: 'red', count: 1 } })
    expect(red.get('.card-icon__count').attributes('style')).toContain('color: rgb(255, 255, 255)')
  })
})
