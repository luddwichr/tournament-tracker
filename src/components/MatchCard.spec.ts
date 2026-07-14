// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import CardIcon from './icons/CardIcon.vue'
import MatchCard from './MatchCard.vue'
import MatchCardMeta from './MatchCardMeta.vue'
import MatchScoreButton from './MatchScoreButton.vue'
import MatchTeamSlot from './MatchTeamSlot.vue'
import type { Result } from '../types/tournament'
import { makeMatch } from '../test-support/matches'
import { makeTeam } from '../test-support/teams'
import { mount } from '@vue/test-utils'

const homeTeam = makeTeam({ id: 'ger', name: 'Deutschland' })
const awayTeam = makeTeam({ id: 'fra', name: 'Frankreich' })

const match = makeMatch({ id: 'M73' })

const result: Result = {
  awayGoals: 1,
  awayRed: 1,
  awayYellow: 2,
  homeGoals: 2,
  homeRed: 0,
  homeYellow: 1,
  matchId: 'M73',
}

type Props = InstanceType<typeof MatchCard>['$props']

function mountCard(overrides: Partial<Props> = {}) {
  return mount(MatchCard, { props: { awayTeam, homeTeam, match, ...overrides } })
}

describe('MatchCard – composition', () => {
  it('renders the meta row, two team slots and the score button', () => {
    const wrapper = mountCard()
    expect(wrapper.findComponent(MatchCardMeta).exists()).toBe(true)
    expect(wrapper.findComponent(MatchScoreButton).exists()).toBe(true)
    expect(wrapper.findAllComponents(MatchTeamSlot)).toHaveLength(2)
  })

  it('wires the home and away teams into their slots', () => {
    const slots = mountCard().findAllComponents(MatchTeamSlot)
    expect(slots[0]!.props()).toMatchObject({ side: 'home', team: homeTeam })
    expect(slots[1]!.props()).toMatchObject({ side: 'away', team: awayTeam })
  })

  it('shows a card icon per non-zero count, centered next to the score', () => {
    const icons = mountCard({ result }).findAllComponents(CardIcon)
    // home: 1 yellow; away: 2 yellow + 1 red
    expect(icons.map((i) => [i.props('color'), i.props('count')])).toEqual([
      ['yellow', 1],
      ['yellow', 2],
      ['red', 1],
    ])
  })

  it('shows no card icons when there are no bookings', () => {
    expect(
      mountCard({ result: { ...result, awayRed: 0, awayYellow: 0, homeYellow: 0 } }).findAllComponents(CardIcon),
    ).toHaveLength(0)
  })
})

describe('MatchCard – accessible score label', () => {
  it('includes card counts for both sides, pluralized correctly', () => {
    const wrapper = mountCard({ result })
    // home: 1 yellow (singular); away: 2 yellow (plural) + 1 red (singular)
    expect(wrapper.findComponent(MatchScoreButton).props('label')).toBe(
      'Deutschland 2, 1 gelbe Karte : 1, 2 gelbe Karten, 1 rote Karte Frankreich – Ergebnis bearbeiten',
    )
  })

  it('omits card mentions entirely when neither side has any bookings', () => {
    const wrapper = mountCard({
      result: { ...result, awayRed: 0, awayYellow: 0, homeRed: 0, homeYellow: 0 },
    })
    expect(wrapper.findComponent(MatchScoreButton).props('label')).toBe(
      'Deutschland 2 : 1 Frankreich – Ergebnis bearbeiten',
    )
  })

  it('pluralizes red cards too, and keeps sides independent', () => {
    const wrapper = mountCard({
      result: { ...result, awayRed: 0, awayYellow: 1, homeRed: 2, homeYellow: 0 },
    })
    expect(wrapper.findComponent(MatchScoreButton).props('label')).toBe(
      'Deutschland 2, 2 rote Karten : 1, 1 gelbe Karte Frankreich – Ergebnis bearbeiten',
    )
  })

  it('falls back to the no-result label (no card info) when there is no result yet', () => {
    const wrapper = mountCard()
    expect(wrapper.findComponent(MatchScoreButton).props('label')).toBe('Deutschland – Frankreich: Ergebnis eingeben')
  })
})

describe('MatchCard – state classes', () => {
  it('is not blocked when both teams are resolved', () => {
    const wrapper = mountCard()
    expect(wrapper.classes()).not.toContain('match-card--blocked')
    expect(wrapper.findComponent(MatchScoreButton).props('disabled')).toBe(false)
  })

  it('is blocked (disabled score button, dashed border) when a team is missing', () => {
    const wrapper = mountCard({ awayPlaceholder: 'Gruppe B – 1.', awayTeam: null })
    expect(wrapper.classes()).toContain('match-card--blocked')
    expect(wrapper.findComponent(MatchScoreButton).props('disabled')).toBe(true)
  })

  it('adds the "played" class when a result is present', () => {
    expect(mountCard({ result }).classes()).toContain('match-card--played')
  })

  it('adds the highlight-ring class when highlighted', () => {
    expect(mountCard({ highlighted: true }).classes()).toContain('highlight-ring')
  })
})

describe('MatchCard – events', () => {
  it('emits "openScore" when the body gutter is clicked (not blocked)', async () => {
    const wrapper = mountCard()
    await wrapper.find('.match-card__body').trigger('click')
    expect(wrapper.emitted('openScore')).toHaveLength(1)
  })

  it('does not emit "openScore" from the body when blocked', async () => {
    const wrapper = mountCard({ homePlaceholder: 'Gruppe A – 1.', homeTeam: null })
    await wrapper.find('.match-card__body').trigger('click')
    expect(wrapper.emitted('openScore')).toBeUndefined()
  })

  it('emits "openScore" once when the score button is pressed (no double via the body)', async () => {
    const wrapper = mountCard()
    await wrapper.find('.match-score-btn').trigger('click')
    expect(wrapper.emitted('openScore')).toHaveLength(1)
  })

  it('forwards a placeholder click with the home slot id', async () => {
    const wrapper = mountCard({ homePlaceholder: 'Gruppe A – 1.', homeTeam: null })
    await wrapper.find('.match-team-slot__placeholder').trigger('click')
    expect(wrapper.emitted('placeholderClick')?.[0]).toEqual(['home'])
  })

  it('forwards a placeholder click with the away slot id', async () => {
    const wrapper = mountCard({ awayPlaceholder: 'Gruppe B – 1.', awayTeam: null })
    await wrapper.find('.match-team-slot__placeholder').trigger('click')
    expect(wrapper.emitted('placeholderClick')?.[0]).toEqual(['away'])
  })

  it('forwards the meta toggle as "toggleHighlight"', async () => {
    const wrapper = mountCard()
    await wrapper.find('.match-card-meta').trigger('click')
    expect(wrapper.emitted('toggleHighlight')).toHaveLength(1)
  })
})
