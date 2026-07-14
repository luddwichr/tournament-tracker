// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import TeamFlag from './TeamFlag.vue'
import { mount } from '@vue/test-utils'

describe('TeamFlag', () => {
  it('applies fi-<flagCode> class to the span', () => {
    const wrapper = mount(TeamFlag, { props: { flagCode: 'de', size: '2rem' } })
    expect(wrapper.find('span').classes()).toContain('fi-de')
  })

  it('has aria-hidden="true" and no role or aria-label', () => {
    const wrapper = mount(TeamFlag, { props: { flagCode: 'de', size: '2rem' } })
    const span = wrapper.find('span')
    expect(span.attributes('aria-hidden')).toBe('true')
    expect(span.attributes('role')).toBeUndefined()
    expect(span.attributes('aria-label')).toBeUndefined()
  })
})
