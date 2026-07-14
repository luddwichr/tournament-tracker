// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { defineComponent, provide, h } from 'vue'
import { mount } from '@vue/test-utils'
import { useAnnounce, announceKey } from './use-announce'

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
