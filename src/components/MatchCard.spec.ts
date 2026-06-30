import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MatchCard from './MatchCard.vue'
import MatchCardMeta from './MatchCardMeta.vue'
import MatchTeamSlot from './MatchTeamSlot.vue'
import MatchScoreButton from './MatchScoreButton.vue'
import type { Result } from '../types/tournament'
import { makeTeam } from '../test-support/teams'
import { makeMatch } from '../test-support/matches'

const homeTeam = makeTeam({ id: 'ger', name: 'Deutschland' })
const awayTeam = makeTeam({ id: 'fra', name: 'Frankreich' })

const match = makeMatch({ id: 'M73' })

const result: Result = {
  matchId: 'M73',
  homeGoals: 2,
  awayGoals: 1,
  homeYellow: 0,
  homeRed: 0,
  awayYellow: 0,
  awayRed: 0,
}

type Props = InstanceType<typeof MatchCard>['$props']

function mountCard(overrides: Partial<Props> = {}) {
  return mount(MatchCard, { props: { match, homeTeam, awayTeam, ...overrides } })
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
    expect(slots[0]!.props()).toMatchObject({ team: homeTeam, side: 'home' })
    expect(slots[1]!.props()).toMatchObject({ team: awayTeam, side: 'away' })
  })
})

describe('MatchCard – state classes', () => {
  it('is not blocked when both teams are resolved', () => {
    const wrapper = mountCard()
    expect(wrapper.classes()).not.toContain('match-card--blocked')
    expect(wrapper.findComponent(MatchScoreButton).props('disabled')).toBe(false)
  })

  it('is blocked (disabled score button, dashed border) when a team is missing', () => {
    const wrapper = mountCard({ awayTeam: null, awayPlaceholder: 'Gruppe B – 1.' })
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
  it('emits "click" when the body gutter is clicked (not blocked)', async () => {
    const wrapper = mountCard()
    await wrapper.find('.match-card__body').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('does not emit "click" from the body when blocked', async () => {
    const wrapper = mountCard({ homeTeam: null, homePlaceholder: 'Gruppe A – 1.' })
    await wrapper.find('.match-card__body').trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('emits "click" once when the score button is pressed (no double via the body)', async () => {
    const wrapper = mountCard()
    await wrapper.find('.match-score-btn').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('forwards a placeholder click with the home slot id', async () => {
    const wrapper = mountCard({ homeTeam: null, homePlaceholder: 'Gruppe A – 1.' })
    await wrapper.find('.match-team-slot__placeholder').trigger('click')
    expect(wrapper.emitted('placeholderClick')?.[0]).toEqual(['home'])
  })

  it('forwards a placeholder click with the away slot id', async () => {
    const wrapper = mountCard({ awayTeam: null, awayPlaceholder: 'Gruppe B – 1.' })
    await wrapper.find('.match-team-slot__placeholder').trigger('click')
    expect(wrapper.emitted('placeholderClick')?.[0]).toEqual(['away'])
  })

  it('forwards the meta toggle as "toggleHighlight"', async () => {
    const wrapper = mountCard()
    await wrapper.find('.match-card-meta').trigger('click')
    expect(wrapper.emitted('toggleHighlight')).toHaveLength(1)
  })
})
