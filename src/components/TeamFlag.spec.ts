import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TeamFlag from './TeamFlag.vue'

describe('TeamFlag', () => {
  it('applies fi-<flagCode> class to the span', () => {
    const wrapper = mount(TeamFlag, { props: { flagCode: 'de', name: 'Deutschland' } })
    expect(wrapper.find('span').classes()).toContain('fi-de')
  })

  it('has role="img" and aria-label when not decorative', () => {
    const wrapper = mount(TeamFlag, { props: { flagCode: 'de', name: 'Deutschland' } })
    const span = wrapper.find('span')
    expect(span.attributes('role')).toBe('img')
    expect(span.attributes('aria-label')).toBe('Deutschland')
  })

  it('has aria-hidden="true" and no role when decorative', () => {
    const wrapper = mount(TeamFlag, { props: { flagCode: 'de', name: 'Deutschland', decorative: true } })
    const span = wrapper.find('span')
    expect(span.attributes('aria-hidden')).toBe('true')
    expect(span.attributes('role')).toBeUndefined()
    expect(span.attributes('aria-label')).toBeUndefined()
  })
})
