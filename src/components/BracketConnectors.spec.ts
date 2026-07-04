import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BracketConnectors from './BracketConnectors.vue'

describe('BracketConnectors', () => {
  // No separate "renders an svg element" test: an svg not existing would
  // already make the aria-hidden assertion below fail (attributes() on a
  // missing element returns undefined, not 'true').
  it('is aria-hidden', () => {
    const wrapper = mount(BracketConnectors, { props: { paths: [] } })
    expect(wrapper.find('svg').attributes('aria-hidden')).toBe('true')
  })

  it('renders one path element per entry', () => {
    const paths = ['M0,0 L10,10', 'M5,5 L20,20', 'M1,1 L3,3']
    const wrapper = mount(BracketConnectors, { props: { paths } })
    expect(wrapper.findAll('path')).toHaveLength(3)
  })

  it('sets the d attribute on each path', () => {
    const paths = ['M0,0 L10,10', 'M5,5 L20,20']
    const wrapper = mount(BracketConnectors, { props: { paths } })
    const els = wrapper.findAll('path')
    expect(els[0]!.attributes('d')).toBe('M0,0 L10,10')
    expect(els[1]!.attributes('d')).toBe('M5,5 L20,20')
  })

  it('renders no paths when the array is empty', () => {
    const wrapper = mount(BracketConnectors, { props: { paths: [] } })
    expect(wrapper.findAll('path')).toHaveLength(0)
  })
})
