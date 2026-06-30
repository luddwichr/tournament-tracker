import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BracketRound, { type MatchRow } from './BracketRound.vue'
import BracketMatchItem from './BracketMatchItem.vue'
import type { MatchSlot } from '../types/tournament'
import { makeTeam } from '../test-support/teams'
import { makeMatch } from '../test-support/matches'

function makeRow(id: string, overrides: Partial<MatchRow> = {}): MatchRow {
  return {
    match: makeMatch({ id }),
    homeTeam: makeTeam(),
    awayTeam: makeTeam(),
    result: null,
    homePlaceholder: '',
    awayPlaceholder: '',
    ...overrides,
  }
}

type Props = InstanceType<typeof BracketRound>['$props']

function mountRound(overrides: Partial<Props> = {}) {
  return mount(BracketRound, {
    props: {
      title: 'Achtelfinale',
      matches: [makeRow('M73'), makeRow('M74')],
      ...overrides,
    },
    attachTo: document.body,
  })
}

describe('BracketRound – structure', () => {
  it('renders a section with the aria-label set to the title', () => {
    const wrapper = mountRound()
    expect(wrapper.find('section').attributes('aria-label')).toBe('Achtelfinale')
  })

  it('renders the title in the header', () => {
    const wrapper = mountRound()
    expect(wrapper.find('h2').text()).toBe('Achtelfinale')
  })

  it('renders one BracketMatchItem per match', () => {
    const wrapper = mountRound()
    expect(wrapper.findAllComponents(BracketMatchItem)).toHaveLength(2)
  })

  it('renders BracketMatchItem components for each match', () => {
    const rows = [makeRow('M73'), makeRow('M74'), makeRow('M75')]
    const wrapper = mountRound({ matches: rows })
    expect(wrapper.findAllComponents(BracketMatchItem)).toHaveLength(3)
  })
})

describe('BracketRound – highlight / pin props', () => {
  it('passes highlighted=true to the matching BracketMatchItem', () => {
    const rows = [makeRow('M73'), makeRow('M74')]
    const wrapper = mountRound({ matches: rows, highlightedMatchIds: ['M73'] })
    const items = wrapper.findAllComponents(BracketMatchItem)
    expect(items[0]!.props('highlighted')).toBe(true)
    expect(items[1]!.props('highlighted')).toBe(false)
  })

  it('passes pinned=true only to the pinned match item', () => {
    const rows = [makeRow('M73'), makeRow('M74')]
    const wrapper = mountRound({ matches: rows, pinnedMatchId: 'M74' })
    const items = wrapper.findAllComponents(BracketMatchItem)
    expect(items[0]!.props('pinned')).toBe(false)
    expect(items[1]!.props('pinned')).toBe(true)
  })

  it('passes sectionLabel through to BracketMatchItem', () => {
    const rows = [makeRow('M73', { sectionLabel: 'Spiel um Platz 3' }), makeRow('M74')]
    const wrapper = mountRound({ matches: rows })
    const items = wrapper.findAllComponents(BracketMatchItem)
    expect(items[0]!.props('sectionLabel')).toBe('Spiel um Platz 3')
    expect(items[1]!.props('sectionLabel')).toBeUndefined()
  })
})

describe('BracketRound – events', () => {
  it('forwards matchClick from a BracketMatchItem', async () => {
    const wrapper = mountRound()
    await wrapper.find('.match-card__body').trigger('click')
    expect(wrapper.emitted('matchClick')).toHaveLength(1)
  })

  it('forwards matchHover with the match id from mouseenter', async () => {
    const wrapper = mountRound()
    await wrapper.find('.bracket-match-item').trigger('mouseenter')
    expect(wrapper.emitted('matchHover')?.[0]).toEqual(['M73'])
  })

  it('forwards matchHoverEnd from mouseleave', async () => {
    const wrapper = mountRound()
    await wrapper.find('.bracket-match-item').trigger('mouseleave')
    expect(wrapper.emitted('matchHoverEnd')).toHaveLength(1)
  })

  it('forwards toggleHighlight from the meta click', async () => {
    const wrapper = mountRound()
    await wrapper.find('.match-card-meta').trigger('click')
    expect(wrapper.emitted('toggleHighlight')?.[0]).toEqual(['M73'])
  })

  it('forwards placeholderClick with match and slot', async () => {
    const rows = [makeRow('M73', { homeTeam: null, homePlaceholder: 'Gruppe A – 1.' })]
    const wrapper = mountRound({ matches: rows })
    await wrapper.find('.match-team-slot__placeholder').trigger('click')
    const [emittedMatch, slot] = wrapper.emitted('placeholderClick')![0] as [MatchSlot, string]
    expect(emittedMatch.id).toBe('M73')
    expect(slot).toBe('home')
  })
})
