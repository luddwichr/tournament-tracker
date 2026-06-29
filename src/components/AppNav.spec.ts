import { describe, it, expect } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'

import AppNav from './AppNav.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/groups', meta: { title: 'Gruppen', navIcon: '🏟️' }, component: { template: '<div />' } },
    { path: '/knockout', meta: { title: 'K.-o.-Runde', navIcon: '🏆' }, component: { template: '<div />' } },
    { path: '/ranking', meta: { title: 'Weltrangliste', navIcon: '🌍' }, component: { template: '<div />' } },
    { path: '/settings', meta: { title: 'Einstellungen', navIcon: '⚙️' }, component: { template: '<div />' } },
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
})
