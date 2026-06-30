import { describe, it, expect } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'

import AppNav from './AppNav.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/groups' },
    { path: '/groups', component: { template: '<div />' } },
    { path: '/knockout', component: { template: '<div />' } },
    { path: '/ranking', component: { template: '<div />' } },
    { path: '/settings', component: { template: '<div />' } },
  ],
})

describe('AppNav', () => {
  it('renders a link for each of the sections', () => {
    const wrapper = mount(AppNav, {
      global: { plugins: [router], stubs: { RouterLink: RouterLinkStub } },
    })

    const labels = wrapper.findAll('.app-nav__label').map((node) => node.text())
    expect(labels).toEqual(['Gruppen', 'K.-o.-Runde', 'Weltrangliste', 'Einstellungen'])
  })

  it('sets aria-current="page" on the active route link', async () => {
    await router.push('/groups')
    await router.isReady()

    const wrapper = mount(AppNav, { global: { plugins: [router] } })
    await wrapper.vm.$nextTick()

    const activeLink = wrapper.find('[aria-current="page"]')
    expect(activeLink.exists()).toBe(true)
    expect(activeLink.text()).toContain('Gruppen')
  })

  it('does not set aria-current on non-active links', async () => {
    await router.push('/groups')
    await router.isReady()

    const wrapper = mount(AppNav, { global: { plugins: [router] } })
    await wrapper.vm.$nextTick()

    const allLinks = wrapper.findAll('.app-nav__link')
    const nonActiveLinks = allLinks.filter((l) => l.attributes('aria-current') !== 'page')
    expect(nonActiveLinks).toHaveLength(3)
  })
})
