// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import InfoDisclosure from './InfoDisclosure.vue'
import { mount } from '@vue/test-utils'

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
