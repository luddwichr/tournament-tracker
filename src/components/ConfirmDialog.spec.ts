// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import ConfirmDialog from './ConfirmDialog.vue'
import { mount } from '@vue/test-utils'

describe('ConfirmDialog', () => {
  it('calls showModal on mount', () => {
    mount(ConfirmDialog, { props: { message: 'M', title: 'T' } })
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledOnce()
  })

  it('renders title and message', () => {
    const wrapper = mount(ConfirmDialog, {
      props: { message: 'Ergebnisse werden ersetzt.', title: 'Daten importieren' },
    })
    expect(wrapper.find('.base-dialog__title').text()).toBe('Daten importieren')
    expect(wrapper.find('.confirm-dialog__message').text()).toBe('Ergebnisse werden ersetzt.')
  })

  it('sets aria-describedby on the dialog pointing to the message id', () => {
    const wrapper = mount(ConfirmDialog, { props: { message: 'M', title: 'T' } })
    const message = wrapper.find('.confirm-dialog__message')
    const dialog = wrapper.find('dialog')
    expect(message.attributes('id')).toBeTruthy()
    expect(dialog.attributes('aria-describedby')).toBe(message.attributes('id'))
  })

  it('uses default confirm label when none provided', () => {
    const wrapper = mount(ConfirmDialog, { props: { message: 'M', title: 'T' } })
    expect(wrapper.find('.btn--danger').text()).toBe('Bestätigen')
  })

  it('uses custom confirm label', () => {
    const wrapper = mount(ConfirmDialog, {
      props: { confirmLabel: 'Ersetzen', message: 'M', title: 'T' },
    })
    expect(wrapper.find('.btn--danger').text()).toBe('Ersetzen')
  })

  it('emits confirm (only) when confirm button is clicked', async () => {
    const wrapper = mount(ConfirmDialog, { props: { message: 'M', title: 'T' } })
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Bestätigen')!
      .trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.emitted('cancel')).toBeUndefined()
  })

  it('emits cancel (only) when cancel button is clicked', async () => {
    const wrapper = mount(ConfirmDialog, { props: { message: 'M', title: 'T' } })
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Abbrechen')!
      .trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })

  it('emits cancel (only) when dialog is closed externally (e.g. Esc)', async () => {
    const wrapper = mount(ConfirmDialog, { props: { message: 'M', title: 'T' } })
    await wrapper.find('dialog').trigger('close')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('confirm')).toBeUndefined()
  })
})
