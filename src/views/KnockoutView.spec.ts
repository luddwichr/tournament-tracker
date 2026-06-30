import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import KnockoutView from './KnockoutView.vue'
import BracketView from '../components/BracketView.vue'
import ScoreDialog from '../components/ScoreDialog.vue'
import { makeMatch } from '../test-support/matches'

const resolvedMatch = makeMatch({
  stage: 'r32',
  homeRef: { kind: 'team', teamId: 'mex' },
  awayRef: { kind: 'team', teamId: 'usa' },
})

const unresolvedMatch = makeMatch({
  stage: 'r32',
  homeRef: { kind: 'matchWinner', matchId: 'M_NONEXISTENT' },
  awayRef: { kind: 'matchWinner', matchId: 'M_NONEXISTENT2' },
})

const partiallyResolvedMatch = makeMatch({
  stage: 'r32',
  homeRef: { kind: 'team', teamId: 'mex' },
  awayRef: { kind: 'matchWinner', matchId: 'M_NONEXISTENT' },
})

beforeEach(() => {
  setActivePinia(createPinia())
  HTMLDialogElement.prototype.showModal = vi.fn()
  HTMLDialogElement.prototype.close = vi.fn().mockImplementation(function (this: HTMLDialogElement) {
    this.dispatchEvent(new Event('close'))
  })
})

function mountView() {
  return mount(KnockoutView, { global: { stubs: { BracketView: true } } })
}

describe('KnockoutView – structure', () => {
  it('renders the heading "K.-o.-Runde"', () => {
    const wrapper = mountView()
    expect(wrapper.find('h1').text()).toBe('K.-o.-Runde')
  })

  it('renders the BracketView component', () => {
    const wrapper = mountView()
    expect(wrapper.findComponent(BracketView).exists()).toBe(true)
  })

  it('does not show ScoreDialog on mount', () => {
    const wrapper = mountView()
    expect(wrapper.findComponent(ScoreDialog).exists()).toBe(false)
  })
})

describe('KnockoutView – ScoreDialog', () => {
  it('shows ScoreDialog after matchClick with resolvable teams', async () => {
    const wrapper = mountView()
    wrapper.findComponent(BracketView).vm.$emit('matchClick', resolvedMatch)
    await nextTick()
    expect(wrapper.findComponent(ScoreDialog).exists()).toBe(true)
  })

  it('does not show ScoreDialog when match refs cannot be resolved', async () => {
    const wrapper = mountView()
    wrapper.findComponent(BracketView).vm.$emit('matchClick', unresolvedMatch)
    await nextTick()
    expect(wrapper.findComponent(ScoreDialog).exists()).toBe(false)
  })

  it('does not show ScoreDialog when only the home team is resolvable', async () => {
    const wrapper = mountView()
    wrapper.findComponent(BracketView).vm.$emit('matchClick', partiallyResolvedMatch)
    await nextTick()
    expect(wrapper.findComponent(ScoreDialog).exists()).toBe(false)
  })

  it('hides ScoreDialog when it emits close', async () => {
    const wrapper = mountView()
    wrapper.findComponent(BracketView).vm.$emit('matchClick', resolvedMatch)
    await nextTick()
    expect(wrapper.findComponent(ScoreDialog).exists()).toBe(true)
    await wrapper.find('dialog').trigger('close')
    expect(wrapper.findComponent(ScoreDialog).exists()).toBe(false)
  })

  it('wires the selected match into ScoreDialog', async () => {
    const wrapper = mountView()
    wrapper.findComponent(BracketView).vm.$emit('matchClick', resolvedMatch)
    await nextTick()
    expect(wrapper.findComponent(ScoreDialog).props('match')).toMatchObject({ id: resolvedMatch.id })
  })
})
