// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import InfoDisclosure from './InfoDisclosure.vue'

describe('InfoDisclosure', () => {
  it('renders the summary text', () => {
    const wrapper = mount(InfoDisclosure, { props: { summary: 'Wie wird das entschieden?' } })
    expect(wrapper.find('summary').text()).toContain('Wie wird das entschieden?')
  })

  it('renders slot content inside the body', () => {
    const wrapper = mount(InfoDisclosure, {
      props: { summary: 'Info' },
      slots: { default: '<p>Erklärung</p>' },
    })
    expect(wrapper.find('.info-disclosure__body').text()).toBe('Erklärung')
  })

  it('is closed by default', () => {
    const wrapper = mount(InfoDisclosure, { props: { summary: 'Info' } })
    expect(wrapper.find('details').attributes('open')).toBeUndefined()
  })
})
