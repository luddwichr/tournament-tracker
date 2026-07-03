import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import KnockoutView from './KnockoutView.vue'
import BracketView from '../components/BracketView.vue'
import { scoreDialogKey } from '../composables/use-score-dialog'
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
})

function mountView(openScoreDialog = vi.fn()) {
  const wrapper = mount(KnockoutView, {
    global: {
      stubs: { BracketView: true },
      provide: { [scoreDialogKey as symbol]: openScoreDialog },
    },
  })
  return { wrapper, openScoreDialog }
}

describe('KnockoutView – structure', () => {
  it('renders the heading "K.-o.-Runde"', () => {
    const { wrapper } = mountView()
    expect(wrapper.find('h1').text()).toBe('K.-o.-Runde')
  })

  it('renders the BracketView component', () => {
    const { wrapper } = mountView()
    expect(wrapper.findComponent(BracketView).exists()).toBe(true)
  })

  it('does not call the score dialog opener on mount', () => {
    const { openScoreDialog } = mountView()
    expect(openScoreDialog).not.toHaveBeenCalled()
  })
})

describe('KnockoutView – score dialog', () => {
  it('calls the score dialog opener after matchClick with resolvable teams', () => {
    const { wrapper, openScoreDialog } = mountView()
    wrapper.findComponent(BracketView).vm.$emit('matchClick', resolvedMatch)
    expect(openScoreDialog).toHaveBeenCalledOnce()
    const [match, home, away] = openScoreDialog.mock.calls[0]!
    expect(match).toMatchObject({ id: resolvedMatch.id })
    expect(home).toMatchObject({ id: 'mex' })
    expect(away).toMatchObject({ id: 'usa' })
  })

  it('does not call the score dialog opener when match refs cannot be resolved', () => {
    const { wrapper, openScoreDialog } = mountView()
    wrapper.findComponent(BracketView).vm.$emit('matchClick', unresolvedMatch)
    expect(openScoreDialog).not.toHaveBeenCalled()
  })

  it('does not call the score dialog opener when only the home team is resolvable', () => {
    const { wrapper, openScoreDialog } = mountView()
    wrapper.findComponent(BracketView).vm.$emit('matchClick', partiallyResolvedMatch)
    expect(openScoreDialog).not.toHaveBeenCalled()
  })
})
