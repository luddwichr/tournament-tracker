// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CardIcon from './CardIcon.vue'

describe('CardIcon', () => {
  it('renders no text when no count is given', () => {
    expect(
      mount(CardIcon, { props: { color: 'yellow' } })
        .find('text')
        .exists(),
    ).toBe(false)
  })

  it('renders the count inside the icon', () => {
    const wrapper = mount(CardIcon, { props: { color: 'red', count: 2 } })
    expect(wrapper.get('text').text()).toBe('2')
  })
})
