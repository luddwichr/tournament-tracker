import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BracketMatchItem from './BracketMatchItem.vue'
import MatchCard from './MatchCard.vue'
import type { Result } from '../types/tournament'
import { makeTeam } from '../test-support/teams'
import { makeMatch } from '../test-support/matches'

const match = makeMatch({ id: 'M73' })

const homeTeam = makeTeam({ id: 'ger', name: 'Deutschland' })
const awayTeam = makeTeam({ id: 'fra', name: 'Frankreich' })

const result: Result = {
  matchId: 'M73',
  homeGoals: 2,
  awayGoals: 1,
  homeYellow: 0,
  homeRed: 0,
  awayYellow: 0,
  awayRed: 0,
}

type Props = InstanceType<typeof BracketMatchItem>['$props']

function mountItem(overrides: Partial<Props> = {}) {
  return mount(BracketMatchItem, {
    props: {
      match,
      homeTeam,
      awayTeam,
      result: null,
      homePlaceholder: '',
      awayPlaceholder: '',
      highlighted: false,
      pinned: false,
      ...overrides,
    },
    attachTo: document.body,
  })
}

describe('BracketMatchItem – structure', () => {
  it('renders a MatchCard', () => {
    expect(mountItem().findComponent(MatchCard).exists()).toBe(true)
  })

  it('sets data-match-id on the wrapper div', () => {
    expect(mountItem().find('.bracket-match-item').attributes('data-match-id')).toBe('M73')
  })

  it('does not render a section label by default', () => {
    expect(mountItem().find('.bracket-round__section-label').exists()).toBe(false)
  })

  it('renders the section label when provided', () => {
    const wrapper = mountItem({ sectionLabel: 'Spiel um Platz 3' })
    expect(wrapper.find('.bracket-round__section-label').text()).toBe('Spiel um Platz 3')
  })
})

describe('BracketMatchItem – MatchCard props', () => {
  it('passes match, homeTeam, awayTeam and result to MatchCard', () => {
    const card = mountItem({ result }).findComponent(MatchCard)
    expect(card.props('match')).toStrictEqual(match)
    expect(card.props('homeTeam')).toStrictEqual(homeTeam)
    expect(card.props('awayTeam')).toStrictEqual(awayTeam)
    expect(card.props('result')).toStrictEqual(result)
  })

  it('passes highlighted=true to MatchCard', () => {
    expect(mountItem({ highlighted: true }).findComponent(MatchCard).props('highlighted')).toBe(true)
  })

  it('passes pinned=true to MatchCard', () => {
    expect(mountItem({ pinned: true }).findComponent(MatchCard).props('pinned')).toBe(true)
  })
})

describe('BracketMatchItem – hover/focus events', () => {
  it('emits matchHover with match id on mouseenter', async () => {
    const wrapper = mountItem()
    await wrapper.find('.bracket-match-item').trigger('mouseenter')
    expect(wrapper.emitted('matchHover')).toEqual([['M73']])
  })

  it('emits matchHoverEnd on mouseleave', async () => {
    const wrapper = mountItem()
    await wrapper.find('.bracket-match-item').trigger('mouseleave')
    expect(wrapper.emitted('matchHoverEnd')).toHaveLength(1)
  })

  it('emits matchHover with match id on focusin', async () => {
    const wrapper = mountItem()
    await wrapper.find('.bracket-match-item').trigger('focusin')
    expect(wrapper.emitted('matchHover')).toEqual([['M73']])
  })

  it('emits matchHoverEnd on focusout', async () => {
    const wrapper = mountItem()
    await wrapper.find('.bracket-match-item').trigger('focusout')
    expect(wrapper.emitted('matchHoverEnd')).toHaveLength(1)
  })
})

describe('BracketMatchItem – forwarded events', () => {
  it('emits matchClick with match when MatchCard fires click', async () => {
    const wrapper = mountItem()
    await wrapper.find('.match-card__body').trigger('click')
    expect(wrapper.emitted('matchClick')?.[0]).toEqual([match])
  })

  it('emits toggleHighlight with match id when MatchCard fires toggleHighlight', async () => {
    const wrapper = mountItem()
    await wrapper.find('.match-card-meta').trigger('click')
    expect(wrapper.emitted('toggleHighlight')?.[0]).toEqual(['M73'])
  })

  it('emits placeholderClick with match and slot when home placeholder is clicked', async () => {
    const wrapper = mountItem({ homeTeam: null, homePlaceholder: 'Gruppe A – 1.' })
    await wrapper.find('.match-team-slot__placeholder').trigger('click')
    expect(wrapper.emitted('placeholderClick')?.[0]).toEqual([match, 'home'])
  })
})
