import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import BracketView from './BracketView.vue'
import BracketRound from './BracketRound.vue'
import BracketConnectors from './BracketConnectors.vue'
import OriginColumn from './OriginColumn.vue'
import PossibleTeamsDialog from './PossibleTeamsDialog.vue'
import type { MatchRow } from './BracketRound.vue'
import { useTournamentStore } from '../stores/tournament'
import { allGroupResults, makeResult } from '../test-support/results'
import { knockoutMatches } from '../data/fixtures-2026'

beforeEach(() => {
  setActivePinia(createPinia())
  HTMLDialogElement.prototype.showModal = vi.fn()
  HTMLDialogElement.prototype.close = vi.fn().mockImplementation(function (this: HTMLDialogElement) {
    this.dispatchEvent(new Event('close'))
  })
  HTMLElement.prototype.scrollIntoView = vi.fn()
})

describe('BracketView – structure', () => {
  it('has a region landmark with the correct label', () => {
    const wrapper = mount(BracketView, { attachTo: document.body })
    const region = wrapper.find('[role="region"]')
    expect(region.exists()).toBe(true)
    expect(region.attributes('aria-label')).toBe('K.-o.-Runde')
  })

  it('renders the OriginColumn', () => {
    const wrapper = mount(BracketView, { attachTo: document.body })
    expect(wrapper.findComponent(OriginColumn).exists()).toBe(true)
  })

  it('renders the BracketConnectors overlay', () => {
    const wrapper = mount(BracketView, { attachTo: document.body })
    expect(wrapper.findComponent(BracketConnectors).exists()).toBe(true)
  })

  it('renders five BracketRound columns (r32, r16, qf, sf, Finale)', () => {
    const wrapper = mount(BracketView, { attachTo: document.body })
    expect(wrapper.findAllComponents(BracketRound)).toHaveLength(5)
  })

  it('renders rounds with the correct titles in order', () => {
    const wrapper = mount(BracketView, { attachTo: document.body })
    const titles = wrapper.findAllComponents(BracketRound).map((r) => r.props('title') as string)
    expect(titles).toEqual(['Runde der 32', 'Achtelfinale', 'Viertelfinale', 'Halbfinale', 'Finale'])
  })
})

describe('BracketView – round match counts', () => {
  it('r32 round contains 16 matches', () => {
    const wrapper = mount(BracketView, { attachTo: document.body })
    const r32 = wrapper.findAllComponents(BracketRound)[0]!
    expect((r32.props('matches') as unknown[]).length).toBe(16)
  })

  it('r16 round contains 8 matches', () => {
    const wrapper = mount(BracketView, { attachTo: document.body })
    const r16 = wrapper.findAllComponents(BracketRound)[1]!
    expect((r16.props('matches') as unknown[]).length).toBe(8)
  })

  it('qf round contains 4 matches', () => {
    const wrapper = mount(BracketView, { attachTo: document.body })
    const qf = wrapper.findAllComponents(BracketRound)[2]!
    expect((qf.props('matches') as unknown[]).length).toBe(4)
  })

  it('sf round contains 2 matches', () => {
    const wrapper = mount(BracketView, { attachTo: document.body })
    const sf = wrapper.findAllComponents(BracketRound)[3]!
    expect((sf.props('matches') as unknown[]).length).toBe(2)
  })

  it('Finale round contains 2 matches (third-place + final)', () => {
    const wrapper = mount(BracketView, { attachTo: document.body })
    const finale = wrapper.findAllComponents(BracketRound)[4]!
    expect((finale.props('matches') as unknown[]).length).toBe(2)
  })
})

describe('BracketView – matchClick forwarding', () => {
  it('re-emits matchClick when a BracketRound emits it', async () => {
    const wrapper = mount(BracketView, { attachTo: document.body })
    const firstRound = wrapper.findAllComponents(BracketRound)[0]!
    const match = (firstRound.props('matches') as Array<{ match: unknown }>)[0]!.match
    await firstRound.vm.$emit('matchClick', match)
    expect(wrapper.emitted('matchClick')).toHaveLength(1)
    expect((wrapper.emitted('matchClick')![0] as unknown[])[0]).toBe(match)
  })
})

describe('BracketView – PossibleTeamsDialog', () => {
  it('shows PossibleTeamsDialog when a BracketRound emits placeholderClick', async () => {
    const wrapper = mount(BracketView, { attachTo: document.body })
    const firstRound = wrapper.findAllComponents(BracketRound)[0]!
    const match = (firstRound.props('matches') as MatchRow[])[0]!.match
    await firstRound.vm.$emit('placeholderClick', match, 'home')
    expect(wrapper.findComponent(PossibleTeamsDialog).exists()).toBe(true)
  })

  it('hides PossibleTeamsDialog when it emits close', async () => {
    const wrapper = mount(BracketView, { attachTo: document.body })
    const firstRound = wrapper.findAllComponents(BracketRound)[0]!
    const match = (firstRound.props('matches') as MatchRow[])[0]!.match
    await firstRound.vm.$emit('placeholderClick', match, 'home')
    expect(wrapper.findComponent(PossibleTeamsDialog).exists()).toBe(true)
    // PossibleTeamsDialog is Teleported to body; emit close on the component directly
    wrapper.findComponent(PossibleTeamsDialog).vm.$emit('close')
    await nextTick()
    expect(wrapper.findComponent(PossibleTeamsDialog).exists()).toBe(false)
  })
})

describe('BracketView – Finale section labels', () => {
  it('first match in Finale has sectionLabel "Spiel um Platz 3"', () => {
    const wrapper = mount(BracketView, { attachTo: document.body })
    const finale = wrapper.findAllComponents(BracketRound)[4]!
    const matches = finale.props('matches') as Array<{ sectionLabel?: string }>
    expect(matches[0]!.sectionLabel).toBe('Spiel um Platz 3')
  })

  it('second match in Finale has sectionLabel "Finale"', () => {
    const wrapper = mount(BracketView, { attachTo: document.body })
    const finale = wrapper.findAllComponents(BracketRound)[4]!
    const matches = finale.props('matches') as Array<{ sectionLabel?: string }>
    expect(matches[1]!.sectionLabel).toBe('Finale')
  })
})

describe('BracketView – scroll to current round on mount', () => {
  it('does not scroll while the group stage is still ongoing', () => {
    mount(BracketView, { attachTo: document.body })
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled()
  })

  it('scrolls the r32 round into view once the group stage completes', () => {
    useTournamentStore().importResults(allGroupResults(1, 0))
    const wrapper = mount(BracketView, { attachTo: document.body })
    const r32Section = wrapper.findAllComponents(BracketRound)[0]!.find('section').element
    expect(r32Section.scrollIntoView).toHaveBeenCalledWith({ inline: 'start', block: 'nearest' })
  })

  it('scrolls the Finale round into view once every knockout match is played', () => {
    const results = allGroupResults(1, 0)
    for (const m of knockoutMatches) {
      results[m.id] = makeResult(m.id, 2, 1)
    }
    useTournamentStore().importResults(results)
    const wrapper = mount(BracketView, { attachTo: document.body })
    const finaleSection = wrapper.findAllComponents(BracketRound)[4]!.find('section').element
    expect(finaleSection.scrollIntoView).toHaveBeenCalledWith({ inline: 'start', block: 'nearest' })
  })
})
