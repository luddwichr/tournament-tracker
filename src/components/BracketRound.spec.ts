import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BracketRound, { type MatchRow } from './BracketRound.vue'
import MatchCard from './MatchCard.vue'
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
      stage: 'r16',
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

  it('sets data-stage on the section for scroll targeting', () => {
    const wrapper = mountRound({ stage: 'qf' })
    expect(wrapper.find('section').attributes('data-stage')).toBe('qf')
  })

  it.each([2, 3])('renders one MatchCard per match (%i matches)', (count) => {
    const rows = Array.from({ length: count }, (_, i) => makeRow(`M${73 + i}`))
    const wrapper = mountRound({ matches: rows })
    expect(wrapper.findAllComponents(MatchCard)).toHaveLength(count)
  })

  it('sets data-match-id on the wrapper div for each row', () => {
    const wrapper = mountRound()
    expect(wrapper.find('[data-match-id="M73"]').exists()).toBe(true)
    expect(wrapper.find('[data-match-id="M74"]').exists()).toBe(true)
  })

  it('does not render a section label when not provided', () => {
    const wrapper = mountRound()
    expect(wrapper.find('.bracket-round__section-label').exists()).toBe(false)
  })

  it('renders the section label when provided on a row', () => {
    const rows = [makeRow('M73', { sectionLabel: 'Spiel um Platz 3' }), makeRow('M74')]
    const wrapper = mountRound({ matches: rows })
    expect(wrapper.find('.bracket-round__section-label').text()).toBe('Spiel um Platz 3')
  })
})

describe('BracketRound – highlight / pin props', () => {
  it('passes highlighted=true to the matching MatchCard', () => {
    const rows = [makeRow('M73'), makeRow('M74')]
    const wrapper = mountRound({ matches: rows, highlightedMatchIds: ['M73'] })
    const cards = wrapper.findAllComponents(MatchCard)
    expect(cards[0]!.props('highlighted')).toBe(true)
    expect(cards[1]!.props('highlighted')).toBe(false)
  })

  it('passes pinned=true only to the pinned MatchCard', () => {
    const rows = [makeRow('M73'), makeRow('M74')]
    const wrapper = mountRound({ matches: rows, pinnedMatchId: 'M74' })
    const cards = wrapper.findAllComponents(MatchCard)
    expect(cards[0]!.props('pinned')).toBe(false)
    expect(cards[1]!.props('pinned')).toBe(true)
  })

  it('passes match, homeTeam, awayTeam and result through to MatchCard', () => {
    const result = {
      matchId: 'M73',
      homeGoals: 2,
      awayGoals: 1,
      homeYellow: 0,
      homeRed: 0,
      awayYellow: 0,
      awayRed: 0,
    }
    const homeTeam = makeTeam({ id: 'ger', name: 'Deutschland' })
    const awayTeam = makeTeam({ id: 'fra', name: 'Frankreich' })
    const rows = [makeRow('M73', { homeTeam, awayTeam, result })]
    const wrapper = mountRound({ matches: rows })
    const card = wrapper.findComponent(MatchCard)
    expect(card.props('match')).toStrictEqual(rows[0]!.match)
    expect(card.props('homeTeam')).toStrictEqual(homeTeam)
    expect(card.props('awayTeam')).toStrictEqual(awayTeam)
    expect(card.props('result')).toStrictEqual(result)
  })
})

describe('BracketRound – events', () => {
  it('emits matchClick from the MatchCard body click', async () => {
    const wrapper = mountRound()
    await wrapper.find('.match-card__body').trigger('click')
    expect(wrapper.emitted('matchClick')).toHaveLength(1)
  })

  it('emits matchHover with the match id from mouseenter', async () => {
    const wrapper = mountRound()
    await wrapper.find('.bracket-match-item').trigger('mouseenter')
    expect(wrapper.emitted('matchHover')?.[0]).toEqual(['M73'])
  })

  it('emits matchHoverEnd from mouseleave', async () => {
    const wrapper = mountRound()
    await wrapper.find('.bracket-match-item').trigger('mouseleave')
    expect(wrapper.emitted('matchHoverEnd')).toHaveLength(1)
  })

  it('emits matchHover with the match id from focusin', async () => {
    const wrapper = mountRound()
    await wrapper.find('.bracket-match-item').trigger('focusin')
    expect(wrapper.emitted('matchHover')?.[0]).toEqual(['M73'])
  })

  it('emits matchHoverEnd from focusout', async () => {
    const wrapper = mountRound()
    await wrapper.find('.bracket-match-item').trigger('focusout')
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
