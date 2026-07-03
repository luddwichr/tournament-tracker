import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import App from './App.vue'
import { useSettingsStore } from './stores/settings'
import { useTeamViewer } from './composables/use-team-viewer'
import { makeTeam } from './test-support/teams'

const team = makeTeam({ id: 'ger', name: 'Deutschland', flagCode: 'de', fifaRanking: 14 })

const OpenerStub = defineComponent({
  setup() {
    const open = useTeamViewer()
    return () => h('button', { class: 'opener', onClick: () => open(team) }, 'open')
  },
})

function makeRouter() {
  return createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/', redirect: '/groups' },
      { path: '/groups', component: OpenerStub, meta: { title: 'Gruppen' } },
      { path: '/knockout', component: { template: '<div />' }, meta: { title: 'K.-o.-Runde' } },
      { path: '/ranking', component: { template: '<div />' } },
      { path: '/settings', component: { template: '<div />' } },
    ],
  })
}

let activeWrapper: ReturnType<typeof mount> | undefined

async function mountApp() {
  const router = makeRouter()
  await router.push('/groups')
  const wrapper = mount(App, { global: { plugins: [router] }, attachTo: document.body })
  activeWrapper = wrapper
  await flushPromises()
  return { wrapper, router }
}

async function openTeamDialog(wrapper: ReturnType<typeof mount>) {
  await wrapper.find('.opener').trigger('click')
  // TeamDialog is a defineAsyncComponent(() => import(...)); the dynamic
  // import needs real transform time in the test runner, not just a
  // microtask flush, so poll until it has resolved and rendered.
  await vi.waitFor(
    () => {
      if (!wrapper.find('.team-dialog__title').exists()) throw new Error('TeamDialog not rendered yet')
    },
    { timeout: 5000 },
  )
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.stubGlobal('scrollTo', vi.fn())
  HTMLDialogElement.prototype.showModal = vi.fn()
  HTMLDialogElement.prototype.close = vi.fn().mockImplementation(function (this: HTMLDialogElement) {
    this.dispatchEvent(new Event('close'))
  })
})

afterEach(() => {
  activeWrapper?.unmount()
  activeWrapper = undefined
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('renders the skip link, header and a focusable main landmark', async () => {
    const { wrapper } = await mountApp()
    expect(wrapper.find('.skip-link').attributes('href')).toBe('#main')
    expect(wrapper.findComponent({ name: 'AppHeader' }).exists()).toBe(true)
    const main = wrapper.find('#main')
    expect(main.attributes('tabindex')).toBe('-1')
  })

  it('sets data-theme on the document element from the settings store', async () => {
    const { wrapper } = await mountApp()
    const settings = useSettingsStore()
    expect(document.documentElement.dataset['theme']).toBe('light')

    settings.theme = 'dark'
    await wrapper.vm.$nextTick()
    expect(document.documentElement.dataset['theme']).toBe('dark')
  })

  it('announces the new page title and focuses main on route change', async () => {
    const { wrapper, router } = await mountApp()

    await router.push('/knockout')
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[role="status"]').text()).toBe('Seite: K.-o.-Runde')
    expect(document.activeElement).toBe(wrapper.find('#main').element)
  })

  it('does not render TeamDialog until a team is opened, then opens it for the selected team', async () => {
    const { wrapper } = await mountApp()
    expect(wrapper.find('.team-dialog__title').exists()).toBe(false)

    await openTeamDialog(wrapper)

    const title = wrapper.find('.team-dialog__title')
    expect(title.exists()).toBe(true)
    expect(title.text()).toBe('Deutschland')
  })

  it('closes TeamDialog when it emits close', async () => {
    const { wrapper } = await mountApp()
    await openTeamDialog(wrapper)
    expect(wrapper.find('.team-dialog__title').exists()).toBe(true)

    await wrapper.find('dialog').trigger('close')
    await flushPromises()
    expect(wrapper.find('.team-dialog__title').exists()).toBe(false)
  })
})
