import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfirmDialog from './ConfirmDialog.vue'

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn()
  HTMLDialogElement.prototype.close = vi.fn().mockImplementation(function (this: HTMLDialogElement) {
    this.dispatchEvent(new Event('close'))
  })
})

describe('ConfirmDialog', () => {
  it('calls showModal on mount', () => {
    mount(ConfirmDialog, { props: { title: 'T', message: 'M' } })
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledOnce()
  })

  it('renders title and message', () => {
    const wrapper = mount(ConfirmDialog, {
      props: { title: 'Daten importieren', message: 'Ergebnisse werden ersetzt.' },
    })
    expect(wrapper.find('#confirm-dialog-title').text()).toBe('Daten importieren')
    expect(wrapper.find('#confirm-dialog-desc').text()).toBe('Ergebnisse werden ersetzt.')
  })

  it('uses default confirm label when none provided', () => {
    const wrapper = mount(ConfirmDialog, { props: { title: 'T', message: 'M' } })
    expect(wrapper.findAll('button')[1]!.text()).toBe('Bestätigen')
  })

  it('uses custom confirm label', () => {
    const wrapper = mount(ConfirmDialog, {
      props: { title: 'T', message: 'M', confirmLabel: 'Ersetzen' },
    })
    expect(wrapper.findAll('button')[1]!.text()).toBe('Ersetzen')
  })

  it('emits confirm (only) when confirm button is clicked', async () => {
    const wrapper = mount(ConfirmDialog, { props: { title: 'T', message: 'M' } })
    await wrapper.findAll('button')[1]!.trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('cancel')).toBeUndefined()
  })

  it('emits cancel (only) when cancel button is clicked', async () => {
    const wrapper = mount(ConfirmDialog, { props: { title: 'T', message: 'M' } })
    await wrapper.findAll('button')[0]!.trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })

  it('emits cancel (only) when dialog is closed externally (e.g. Esc)', async () => {
    const wrapper = mount(ConfirmDialog, { props: { title: 'T', message: 'M' } })
    await wrapper.find('dialog').trigger('close')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })
})
