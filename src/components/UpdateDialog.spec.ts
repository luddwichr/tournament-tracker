// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import UpdateDialog from './UpdateDialog.vue'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'

vi.mock('virtual:pwa-register/vue', () => ({
  useRegisterSW: vi.fn(),
}))

function mockRegisterSW(needRefresh: boolean) {
  const needRefreshRef = ref(needRefresh)
  const updateServiceWorker = vi.fn()
  vi.mocked(useRegisterSW).mockReturnValue({
    needRefresh: needRefreshRef,
    offlineReady: ref(false),
    updateServiceWorker,
  })
  return { needRefresh: needRefreshRef, updateServiceWorker }
}

describe('UpdateDialog', () => {
  it('does not render when no update is available', () => {
    mockRegisterSW(false)
    const wrapper = mount(UpdateDialog)
    expect(wrapper.find('dialog').exists()).toBe(false)
  })

  it('renders the dialog once an update is available', () => {
    mockRegisterSW(true)
    const wrapper = mount(UpdateDialog)
    expect(wrapper.find('.base-dialog__title').text()).toBe('Update verfügbar')
  })

  it('calls updateServiceWorker when "Aktualisieren" is clicked', async () => {
    const { updateServiceWorker } = mockRegisterSW(true)
    const wrapper = mount(UpdateDialog)
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Aktualisieren')!
      .trigger('click')
    expect(updateServiceWorker).toHaveBeenCalledOnce()
  })

  it('dismisses without reloading when "Später" is clicked', async () => {
    const { needRefresh, updateServiceWorker } = mockRegisterSW(true)
    const wrapper = mount(UpdateDialog)
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Später')!
      .trigger('click')
    expect(needRefresh.value).toBe(false)
    expect(updateServiceWorker).not.toHaveBeenCalled()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('dialog').exists()).toBe(false)
  })

  it('sets needRefresh to false when the dialog is closed externally (e.g. Esc)', async () => {
    const { needRefresh } = mockRegisterSW(true)
    const wrapper = mount(UpdateDialog)
    await wrapper.find('dialog').trigger('close')
    expect(needRefresh.value).toBe(false)
  })
})
