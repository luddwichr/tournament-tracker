// @vitest-environment jsdom
import { announceKey, provideAnnounce, useAnnounce } from './use-announce'
import { defineComponent, h, nextTick, provide } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

describe('useAnnounce', () => {
  it('calls the injected announce function with the given message', () => {
    const fn = vi.fn()
    let capturedAnnounce: ((msg: string) => void) | undefined

    const Child = defineComponent({
      setup() {
        capturedAnnounce = useAnnounce()
      },
      template: '<div></div>',
    })

    const Parent = defineComponent({
      setup() {
        provide(announceKey, fn)
        return () => h(Child)
      },
    })

    mount(Parent)
    capturedAnnounce!('hello world')
    expect(fn).toHaveBeenCalledWith('hello world')
  })

  it('returns a no-op function when no provider is present', () => {
    let capturedAnnounce: ((msg: string) => void) | undefined

    const Component = defineComponent({
      setup() {
        capturedAnnounce = useAnnounce()
      },
      template: '<div></div>',
    })

    mount(Component)
    // Should not throw
    expect(() => {
      capturedAnnounce!('ignored')
    }).not.toThrow()
  })

  it('returns a function — not the message itself', () => {
    let capturedAnnounce: unknown

    const Component = defineComponent({
      setup() {
        capturedAnnounce = useAnnounce()
      },
      template: '<div></div>',
    })

    mount(Component)
    expect(typeof capturedAnnounce).toBe('function')
  })
})

describe('provideAnnounce', () => {
  it('exposes the message to descendants and reflects it in the announcement ref after a tick', async () => {
    let capturedAnnounce: ((msg: string) => void) | undefined
    let capturedAnnouncement: { value: string } | undefined

    const Child = defineComponent({
      setup() {
        capturedAnnounce = useAnnounce()
      },
      template: '<div></div>',
    })

    const Parent = defineComponent({
      setup() {
        const { announcement } = provideAnnounce()
        capturedAnnouncement = announcement
        return () => h(Child)
      },
    })

    mount(Parent)
    capturedAnnounce!('Tor!')
    // Cleared first so the same message re-announces, then set on next tick.
    expect(capturedAnnouncement!.value).toBe('')
    await nextTick()
    expect(capturedAnnouncement!.value).toBe('Tor!')
  })
})
