// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StepperInput from './StepperInput.vue'

describe('StepperInput', () => {
  it('renders the current value', () => {
    const wrapper = mount(StepperInput, {
      props: { modelValue: 3, decLabel: 'dec', incLabel: 'inc' },
    })
    expect(wrapper.find('.stepper__value').text()).toBe('3')
  })

  it('increment button emits updated value', async () => {
    const wrapper = mount(StepperInput, {
      props: { modelValue: 2, decLabel: 'dec', incLabel: 'inc' },
    })
    await wrapper.findAll('button')[1]!.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[3]])
  })

  it('decrement button emits updated value', async () => {
    const wrapper = mount(StepperInput, {
      props: { modelValue: 2, decLabel: 'dec', incLabel: 'inc' },
    })
    await wrapper.findAll('button')[0]!.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[1]])
  })

  it('does not go below 0', async () => {
    const wrapper = mount(StepperInput, {
      props: { modelValue: 0, decLabel: 'dec', incLabel: 'inc' },
    })
    await wrapper.findAll('button')[0]!.trigger('click')
    // value is already at 0 — defineModel skips emitting unchanged values
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('disables the decrement button when the value is 0', () => {
    const wrapper = mount(StepperInput, {
      props: { modelValue: 0, decLabel: 'dec', incLabel: 'inc' },
    })
    const [dec] = wrapper.findAll('button')
    expect(dec!.attributes('disabled')).toBeDefined()
  })

  it('enables the decrement button once the value is above 0', () => {
    const wrapper = mount(StepperInput, {
      props: { modelValue: 1, decLabel: 'dec', incLabel: 'inc' },
    })
    const [dec] = wrapper.findAll('button')
    expect(dec!.attributes('disabled')).toBeUndefined()
  })

  it('uses provided aria-labels on buttons', () => {
    const wrapper = mount(StepperInput, {
      props: { modelValue: 0, decLabel: 'Verringern', incLabel: 'Erhöhen' },
    })
    const [dec, inc] = wrapper.findAll('button')
    expect(dec!.attributes('aria-label')).toBe('Verringern')
    expect(inc!.attributes('aria-label')).toBe('Erhöhen')
  })

  it('value span has aria-live="polite" and aria-atomic="true"', () => {
    const wrapper = mount(StepperInput, {
      props: { modelValue: 0, decLabel: 'dec', incLabel: 'inc' },
    })
    const span = wrapper.find('.stepper__value')
    expect(span.attributes('aria-live')).toBe('polite')
    expect(span.attributes('aria-atomic')).toBe('true')
  })

  it('value implements the ARIA spinbutton pattern with a derived accessible name', () => {
    const wrapper = mount(StepperInput, {
      props: {
        modelValue: 2,
        decLabel: 'Tor für Team A abziehen',
        incLabel: 'Tor für Team A hinzufügen',
      },
    })
    const span = wrapper.find('.stepper__value')
    expect(span.attributes('role')).toBe('spinbutton')
    expect(span.attributes('tabindex')).toBe('0')
    expect(span.attributes('aria-label')).toBe('Tor für Team A')
    expect(span.attributes('aria-valuenow')).toBe('2')
    expect(span.attributes('aria-valuemin')).toBe('0')
  })

  it('falls back to combining both labels when decLabel and incLabel share no common prefix', () => {
    const wrapper = mount(StepperInput, {
      props: { modelValue: 0, decLabel: 'dec', incLabel: 'inc' },
    })
    expect(wrapper.find('.stepper__value').attributes('aria-label')).toBe('dec / inc')
  })

  it('ArrowUp on the value increments, ArrowDown decrements, Home resets to 0', async () => {
    const wrapper = mount(StepperInput, {
      props: { modelValue: 2, decLabel: 'dec', incLabel: 'inc' },
    })
    const span = wrapper.find('.stepper__value')
    await span.trigger('keydown', { key: 'ArrowUp' })
    await span.trigger('keydown', { key: 'ArrowDown' })
    await span.trigger('keydown', { key: 'Home' })
    expect(wrapper.emitted('update:modelValue')).toEqual([[3], [2], [0]])
  })

  it('applies stepper--sm class by default', () => {
    const wrapper = mount(StepperInput, {
      props: { modelValue: 0, decLabel: 'dec', incLabel: 'inc' },
    })
    expect(wrapper.find('.stepper').classes()).toContain('stepper--sm')
  })

  it('applies stepper--lg class when size="lg"', () => {
    const wrapper = mount(StepperInput, {
      props: { modelValue: 0, decLabel: 'dec', incLabel: 'inc', size: 'lg' },
    })
    expect(wrapper.find('.stepper').classes()).toContain('stepper--lg')
  })
})
