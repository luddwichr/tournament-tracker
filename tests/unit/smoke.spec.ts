import { describe, it, expect } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'

import AppNav from '@/components/AppNav.vue'

describe('AppNav', () => {
  it('renders a link for each of the three sections', () => {
    const wrapper = mount(AppNav, {
      global: { stubs: { RouterLink: RouterLinkStub } },
    })

    const labels = wrapper.findAll('.app-nav__label').map((node) => node.text())
    expect(labels).toEqual(['Gruppen', 'K.-o.-Runde', 'Einstellungen'])
  })
})
