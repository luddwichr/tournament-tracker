// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SyncDialog from './SyncDialog.vue'
import type { SyncStatus } from '../composables/use-results-sync'

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn()
  HTMLDialogElement.prototype.close = vi.fn().mockImplementation(function (this: HTMLDialogElement) {
    this.dispatchEvent(new Event('close'))
  })
})

function mountDialog(props: Partial<InstanceType<typeof SyncDialog>['$props']> = {}) {
  return mount(SyncDialog, {
    props: { status: 'confirm' as SyncStatus, progress: null, error: null, count: 0, ...props },
  })
}

function button(wrapper: ReturnType<typeof mountDialog>, text: string) {
  return wrapper.findAll('button').find((b) => b.text().includes(text))!
}

describe('SyncDialog', () => {
  it('confirm: warns about replacement and emits confirm', async () => {
    const wrapper = mountDialog({ status: 'confirm' })
    expect(wrapper.find('.base-dialog__title').text()).toBe('Ergebnisse abrufen')
    expect(wrapper.text()).toContain('ersetzt')
    await button(wrapper, 'Abrufen & ersetzen').trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('sets aria-describedby on the dialog pointing to the body id', () => {
    const wrapper = mountDialog({ status: 'confirm' })
    const body = wrapper.find('.sync-dialog__body')
    const dialog = wrapper.find('dialog')
    expect(body.attributes('id')).toBeTruthy()
    expect(dialog.attributes('aria-describedby')).toBe(body.attributes('id'))
  })

  it('confirm: Abbrechen closes and emits cancel', async () => {
    const wrapper = mountDialog({ status: 'confirm' })
    await button(wrapper, 'Abbrechen').trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('syncing: shows the football spinner and progress', () => {
    const wrapper = mountDialog({ status: 'syncing', progress: { done: 3, total: 7 } })
    expect(wrapper.find('.sync-dialog__spinner').text()).toBe('⚽')
    expect(wrapper.find('.sync-dialog__status').text()).toContain('3/7')
  })

  it('syncing: can be cancelled', async () => {
    const wrapper = mountDialog({ status: 'syncing', progress: null })
    expect(wrapper.find('.sync-dialog__status').text()).not.toContain('/')
    await button(wrapper, 'Abbrechen').trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('done: reports the number of updated matches', async () => {
    const wrapper = mountDialog({ status: 'done', count: 42 })
    expect(wrapper.find('.sync-dialog__done').text()).toContain('42')
    await button(wrapper, 'Schließen').trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('error: shows the message with retry and cancel', async () => {
    const wrapper = mountDialog({ status: 'error', error: 'Kein Internet' })
    expect(wrapper.find('.sync-dialog__error').text()).toBe('Kein Internet')
    await button(wrapper, 'Erneut versuchen').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
    await button(wrapper, 'Abbrechen').trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('error: falls back to a generic message when none is given', () => {
    const wrapper = mountDialog({ status: 'error', error: null })
    expect(wrapper.find('.sync-dialog__error').text()).toBe('Abruf fehlgeschlagen.')
  })

  it('emits cancel when the dialog is dismissed (Esc/backdrop)', async () => {
    const wrapper = mountDialog({ status: 'syncing' })
    await wrapper.find('dialog').trigger('close')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})
