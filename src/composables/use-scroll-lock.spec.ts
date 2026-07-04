// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { useScrollLock } from './use-scroll-lock'

const LockComponent = defineComponent({
  setup() {
    useScrollLock()
  },
  template: '<div></div>',
})

describe('useScrollLock', () => {
  beforeEach(() => {
    vi.stubGlobal('scrollTo', vi.fn())
    // Reset any lingering body styles from a previous test
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.width = ''
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.width = ''
  })

  it('sets position:fixed on the body when a component mounts', () => {
    const wrapper = mount(LockComponent)
    expect(document.body.style.position).toBe('fixed')
    wrapper.unmount()
  })

  it('restores an empty body position when the component unmounts', () => {
    const wrapper = mount(LockComponent)
    wrapper.unmount()
    expect(document.body.style.position).toBe('')
  })

  it('sets body width to 100% while locked', () => {
    const wrapper = mount(LockComponent)
    expect(document.body.style.width).toBe('100%')
    wrapper.unmount()
  })

  it('ref-counts: body stays fixed while a second instance is still mounted', () => {
    const w1 = mount(LockComponent)
    const w2 = mount(LockComponent)
    w1.unmount()
    // w2 still mounted — lock must remain
    expect(document.body.style.position).toBe('fixed')
    w2.unmount()
    expect(document.body.style.position).toBe('')
  })

  it('restores empty styles only after the last lock is released', () => {
    const w1 = mount(LockComponent)
    const w2 = mount(LockComponent)
    const w3 = mount(LockComponent)
    w1.unmount()
    w2.unmount()
    expect(document.body.style.position).toBe('fixed') // w3 still mounted
    w3.unmount()
    expect(document.body.style.position).toBe('')
  })
})
