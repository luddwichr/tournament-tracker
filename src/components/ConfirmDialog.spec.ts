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
    expect(wrapper.find('.base-dialog__title').text()).toBe('Daten importieren')
    expect(wrapper.find('.confirm-dialog__message').text()).toBe('Ergebnisse werden ersetzt.')
  })

  it('sets aria-describedby on the dialog pointing to the message id', () => {
    const wrapper = mount(ConfirmDialog, { props: { title: 'T', message: 'M' } })
    const message = wrapper.find('.confirm-dialog__message')
    const dialog = wrapper.find('dialog')
    expect(message.attributes('id')).toBeTruthy()
    expect(dialog.attributes('aria-describedby')).toBe(message.attributes('id'))
  })

  it('uses default confirm label when none provided', () => {
    const wrapper = mount(ConfirmDialog, { props: { title: 'T', message: 'M' } })
    expect(wrapper.find('.btn--danger').text()).toBe('Bestätigen')
  })

  it('uses custom confirm label', () => {
    const wrapper = mount(ConfirmDialog, {
      props: { title: 'T', message: 'M', confirmLabel: 'Ersetzen' },
    })
    expect(wrapper.find('.btn--danger').text()).toBe('Ersetzen')
  })

  it('emits confirm (only) when confirm button is clicked', async () => {
    const wrapper = mount(ConfirmDialog, { props: { title: 'T', message: 'M' } })
    await wrapper.find('.btn--danger').trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('cancel')).toBeUndefined()
  })

  it('emits cancel (only) when cancel button is clicked', async () => {
    const wrapper = mount(ConfirmDialog, { props: { title: 'T', message: 'M' } })
    await wrapper.find('.btn--secondary').trigger('click')
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
