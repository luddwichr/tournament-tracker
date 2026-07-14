// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import ThemePicker from './ThemePicker.vue'
import { mount } from '@vue/test-utils'

describe('ThemePicker', () => {
  it('renders three theme options', () => {
    const wrapper = mount(ThemePicker, { props: { modelValue: 'light' } })
    expect(wrapper.findAll('.theme-picker__option')).toHaveLength(3)
  })

  it('renders option labels "Hell", "Dunkel" and "System"', () => {
    const wrapper = mount(ThemePicker, { props: { modelValue: 'light' } })
    const labels = wrapper.findAll('.theme-picker__option').map((el) => el.text())
    expect(labels[0]).toContain('Hell')
    expect(labels[1]).toContain('Dunkel')
    expect(labels[2]).toContain('System')
  })

  it('applies --active class only to the option matching modelValue', () => {
    const wrapper = mount(ThemePicker, { props: { modelValue: 'dark' } })
    const options = wrapper.findAll('.theme-picker__option')
    expect(options[0]!.classes()).not.toContain('theme-picker__option--active')
    expect(options[1]!.classes()).toContain('theme-picker__option--active')
  })

  it('marks the radio input matching modelValue as checked', () => {
    const wrapper = mount(ThemePicker, { props: { modelValue: 'dark' } })
    const radios = wrapper.findAll('input[type="radio"]')
    expect((radios[0]!.element as HTMLInputElement).checked).toBe(false)
    expect((radios[1]!.element as HTMLInputElement).checked).toBe(true)
  })

  it('emits update:modelValue with the selected value when a radio changes', async () => {
    const wrapper = mount(ThemePicker, { props: { modelValue: 'light' } })
    const darkRadio = wrapper.findAll('input[type="radio"]')[1]!
    await darkRadio.trigger('change')
    expect(wrapper.emitted('update:modelValue')).toEqual([['dark']])
  })

  it('emits update:modelValue for the light option', async () => {
    const wrapper = mount(ThemePicker, { props: { modelValue: 'dark' } })
    const lightRadio = wrapper.findAll('input[type="radio"]')[0]!
    await lightRadio.trigger('change')
    expect(wrapper.emitted('update:modelValue')).toEqual([['light']])
  })

  it('renders the legend as visually hidden', () => {
    const wrapper = mount(ThemePicker, { props: { modelValue: 'light' } })
    expect(wrapper.find('legend').classes()).toContain('visually-hidden')
  })
})
