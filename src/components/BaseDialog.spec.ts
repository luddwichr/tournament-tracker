// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseDialog from './BaseDialog.vue'

describe('BaseDialog', () => {
  it('calls showModal on mount', () => {
    mount(BaseDialog)
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledOnce()
  })

  it('emits close when the native dialog fires its close event', async () => {
    const wrapper = mount(BaseDialog)
    await wrapper.find('dialog').trigger('close')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('omits aria-modal (redundant with native showModal() semantics)', () => {
    const wrapper = mount(BaseDialog)
    expect(wrapper.find('dialog').attributes('aria-modal')).toBeUndefined()
  })

  describe('title prop', () => {
    it('renders h2 with the title text', () => {
      const wrapper = mount(BaseDialog, { props: { title: 'Test Titel' } })
      expect(wrapper.find('.base-dialog__title').text()).toBe('Test Titel')
    })

    it('sets aria-labelledby on the dialog pointing to the h2 id', () => {
      const wrapper = mount(BaseDialog, { props: { title: 'Test Titel' } })
      const h2 = wrapper.find('.base-dialog__title')
      const dialog = wrapper.find('dialog')
      expect(h2.attributes('id')).toBeTruthy()
      expect(dialog.attributes('aria-labelledby')).toBe(h2.attributes('id'))
    })
  })

  describe('ariaLabel prop', () => {
    it('sets aria-label on the dialog', () => {
      const wrapper = mount(BaseDialog, { props: { ariaLabel: 'Mein Dialog' } })
      expect(wrapper.find('dialog').attributes('aria-label')).toBe('Mein Dialog')
    })

    it('omits aria-labelledby when ariaLabel is provided', () => {
      const wrapper = mount(BaseDialog, { props: { ariaLabel: 'Mein Dialog' } })
      expect(wrapper.find('dialog').attributes('aria-labelledby')).toBeUndefined()
    })
  })

  it('sets aria-describedby when ariaDescribedby is provided', () => {
    const wrapper = mount(BaseDialog, { props: { ariaDescribedby: 'my-desc' } })
    expect(wrapper.find('dialog').attributes('aria-describedby')).toBe('my-desc')
  })

  describe('close button', () => {
    it('renders by default', () => {
      const wrapper = mount(BaseDialog)
      expect(wrapper.find('[aria-label="Schließen"]').exists()).toBe(true)
    })

    it('is hidden when showCloseButton is false', () => {
      const wrapper = mount(BaseDialog, { props: { showCloseButton: false } })
      expect(wrapper.find('[aria-label="Schließen"]').exists()).toBe(false)
    })

    it('click emits close', async () => {
      const wrapper = mount(BaseDialog)
      await wrapper.find('[aria-label="Schließen"]').trigger('click')
      expect(wrapper.emitted('close')).toHaveLength(1)
    })
  })

  describe('exposed close()', () => {
    it('triggers the close emit', async () => {
      const wrapper = mount(BaseDialog)
      wrapper.vm.close()
      await wrapper.vm.$nextTick()
      expect(wrapper.emitted('close')).toHaveLength(1)
    })
  })

  describe('maxWidth prop', () => {
    it('sets the --dialog-max-width CSS custom property', () => {
      const wrapper = mount(BaseDialog, { props: { maxWidth: 'min(92vw, 32rem)' } })
      expect(wrapper.find('dialog').attributes('style')).toContain('min(92vw, 32rem)')
    })
  })

  describe('maxHeight prop', () => {
    it('adds base-dialog--scrollable class and tabindex="0" on body when set', () => {
      const wrapper = mount(BaseDialog, { props: { maxHeight: 'min(90vh, 40rem)' } })
      expect(wrapper.find('dialog').classes()).toContain('base-dialog--scrollable')
      expect(wrapper.find('.base-dialog__body').attributes('tabindex')).toBe('0')
    })

    it('omits scrollable class and tabindex when not set', () => {
      const wrapper = mount(BaseDialog)
      expect(wrapper.find('dialog').classes()).not.toContain('base-dialog--scrollable')
      expect(wrapper.find('.base-dialog__body').attributes('tabindex')).toBeUndefined()
    })
  })

  describe('slots', () => {
    it('renders default slot content in the body', () => {
      const wrapper = mount(BaseDialog, {
        slots: { default: '<p class="body-content">Inhalt</p>' },
      })
      expect(wrapper.find('.base-dialog__body .body-content').text()).toBe('Inhalt')
    })

    it('title slot replaces the default h2', () => {
      const wrapper = mount(BaseDialog, {
        slots: { title: '<span class="custom-title">Eigener Titel</span>' },
      })
      expect(wrapper.find('.custom-title').text()).toBe('Eigener Titel')
      expect(wrapper.find('.base-dialog__title').exists()).toBe(false)
    })

    it('renders footer slot content inside the footer element', () => {
      const wrapper = mount(BaseDialog, {
        slots: { footer: '<button class="ok-btn">OK</button>' },
      })
      expect(wrapper.find('.base-dialog__footer').exists()).toBe(true)
      expect(wrapper.find('.ok-btn').text()).toBe('OK')
    })

    it('omits the footer element when footer slot is not provided', () => {
      const wrapper = mount(BaseDialog)
      expect(wrapper.find('.base-dialog__footer').exists()).toBe(false)
    })
  })
})
