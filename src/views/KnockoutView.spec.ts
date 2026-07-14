// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import BracketView from '../components/BracketView.vue'
import KnockoutView from './KnockoutView.vue'
import { mount } from '@vue/test-utils'

beforeEach(() => {
  setActivePinia(createPinia())
})

function mountView() {
  return mount(KnockoutView, { global: { stubs: { BracketView: true } } })
}

describe('KnockoutView – structure', () => {
  it('renders the heading "K.-o.-Runde"', () => {
    expect(mountView().find('h1').text()).toBe('K.-o.-Runde')
  })

  it('renders the BracketView component', () => {
    expect(mountView().findComponent(BracketView).exists()).toBe(true)
  })
})
