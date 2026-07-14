// @vitest-environment jsdom
import { type Router, createRouter, createWebHashHistory } from 'vue-router'
import { beforeEach, describe, expect, it } from 'vitest'
import AppHeader from './AppHeader.vue'
import AppNav from './AppNav.vue'
import { mount } from '@vue/test-utils'

let router: Router

beforeEach(() => {
  router = createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/', redirect: '/groups' },
      { component: { template: '<div />' }, path: '/groups' },
      { component: { template: '<div />' }, path: '/knockout' },
      { component: { template: '<div />' }, path: '/ranking' },
      { component: { template: '<div />' }, path: '/settings' },
    ],
  })
})

function mountHeader(options: { attachTo?: Element } = {}) {
  return mount(AppHeader, { global: { plugins: [router] }, ...options })
}

describe('AppHeader – layout', () => {
  it('renders the app title', () => {
    const wrapper = mountHeader()
    expect(wrapper.find('.app-header__title').text()).toBe('⚽ WM 2026 Tracker')
  })

  it('passes open=false to AppNav on mount', () => {
    const wrapper = mountHeader()
    expect(wrapper.findComponent(AppNav).props('open')).toBe(false)
  })

  it('burger has aria-expanded="false" on mount', () => {
    const wrapper = mountHeader()
    expect(wrapper.find('.app-header__burger').attributes('aria-expanded')).toBe('false')
  })

  it('burger has aria-controls="app-nav-list"', () => {
    const wrapper = mountHeader()
    expect(wrapper.find('.app-header__burger').attributes('aria-controls')).toBe('app-nav-list')
  })
})

describe('AppHeader – burger toggle', () => {
  it('clicking the burger sets aria-expanded to true', async () => {
    const wrapper = mountHeader()
    await wrapper.find('.app-header__burger').trigger('click')
    expect(wrapper.find('.app-header__burger').attributes('aria-expanded')).toBe('true')
  })

  it('clicking the burger passes open=true to AppNav', async () => {
    const wrapper = mountHeader()
    await wrapper.find('.app-header__burger').trigger('click')
    expect(wrapper.findComponent(AppNav).props('open')).toBe(true)
  })

  it('clicking the burger a second time closes the nav', async () => {
    const wrapper = mountHeader()
    await wrapper.find('.app-header__burger').trigger('click')
    await wrapper.find('.app-header__burger').trigger('click')
    expect(wrapper.find('.app-header__burger').attributes('aria-expanded')).toBe('false')
    expect(wrapper.findComponent(AppNav).props('open')).toBe(false)
  })
})

describe('AppHeader – keyboard', () => {
  it('pressing Escape closes the nav', async () => {
    const wrapper = mountHeader()
    await wrapper.find('.app-header__burger').trigger('click')
    await wrapper.find('.app-header').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('.app-header__burger').attributes('aria-expanded')).toBe('false')
  })

  it('pressing Escape returns focus to the burger button', async () => {
    const wrapper = mountHeader({ attachTo: document.body })
    await wrapper.find('.app-header__burger').trigger('click')
    await wrapper.find('.app-header').trigger('keydown', { key: 'Escape' })
    expect(document.activeElement).toBe(wrapper.find('.app-header__burger').element)
    wrapper.unmount()
  })

  it('pressing Escape while the nav is already closed does not steal focus', async () => {
    const wrapper = mountHeader({ attachTo: document.body })
    await wrapper.find('.app-header').trigger('keydown', { key: 'Escape' })
    expect(document.activeElement).not.toBe(wrapper.find('.app-header__burger').element)
    wrapper.unmount()
  })

  it('pressing a non-Escape key does not close the nav', async () => {
    const wrapper = mountHeader()
    await wrapper.find('.app-header__burger').trigger('click')
    await wrapper.find('.app-header').trigger('keydown', { key: 'Enter' })
    expect(wrapper.find('.app-header__burger').attributes('aria-expanded')).toBe('true')
  })
})

describe('AppHeader – route watcher', () => {
  it('navigating to a new route closes the nav', async () => {
    await router.push('/groups')
    await router.isReady()
    const wrapper = mountHeader()
    await wrapper.find('.app-header__burger').trigger('click')
    expect(wrapper.find('.app-header__burger').attributes('aria-expanded')).toBe('true')
    await router.push('/knockout')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.app-header__burger').attributes('aria-expanded')).toBe('false')
  })
})
