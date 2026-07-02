import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TeamSchedule from './TeamSchedule.vue'
import MatchCard from './MatchCard.vue'
import ScoreDialog from './ScoreDialog.vue'
import type { MatchSlot, Team } from '../types/tournament'
import type { TeamMatchEntry } from '../lib/team-schedule'
import { makeTeam } from '../test-support/teams'
import { makeResult } from '../test-support/results'

beforeEach(() => {
  setActivePinia(createPinia())
  HTMLDialogElement.prototype.showModal = vi.fn()
  HTMLDialogElement.prototype.close = vi.fn().mockImplementation(function (this: HTMLDialogElement) {
    this.dispatchEvent(new Event('close'))
  })
})

const ger = makeTeam({ id: 'ger', name: 'Deutschland' })
const jpn = makeTeam({ id: 'jpn', name: 'Japan' })

function groupMatch(id: string, kickoff: string, home: Team, away: Team): MatchSlot {
  return {
    id,
    stage: 'group',
    group: 'A',
    kickoff,
    homeRef: { kind: 'team', teamId: home.id },
    awayRef: { kind: 'team', teamId: away.id },
  }
}

function knockoutMatch(id: string, stage: MatchSlot['stage'], kickoff: string, home: Team | null): MatchSlot {
  return {
    id,
    stage,
    kickoff,
    homeRef: home ? { kind: 'team', teamId: home.id } : { kind: 'groupRank', group: 'B', rank: 1 },
    awayRef: { kind: 'groupRank', group: 'C', rank: 2 },
  }
}

describe('TeamSchedule', () => {
  it('shows an empty-state message when there are no entries', () => {
    const wrapper = mount(TeamSchedule, { props: { entries: [] } })
    expect(wrapper.find('.team-schedule__empty').exists()).toBe(true)
    expect(wrapper.findComponent(MatchCard).exists()).toBe(false)
  })

  it('renders a MatchCard per entry, latest kickoff first, with hideLinkIcon', () => {
    const entries: TeamMatchEntry[] = [
      { match: groupMatch('M2', '2026-06-15T00:00:00Z', ger, jpn), homeTeam: ger, awayTeam: jpn, result: null },
      { match: groupMatch('M1', '2026-06-10T00:00:00Z', ger, jpn), homeTeam: ger, awayTeam: jpn, result: null },
    ]
    const wrapper = mount(TeamSchedule, { props: { entries } })
    const cards = wrapper.findAllComponents(MatchCard)
    expect(cards.map((c) => c.props('match').id)).toEqual(['M2', 'M1'])
    expect(cards.every((c) => c.props('hideLinkIcon') === true)).toBe(true)
  })

  it('numbers group matches "Gruppenspiel n/3" per team chronologically, but lists them latest-first', () => {
    const entries: TeamMatchEntry[] = [
      { match: groupMatch('M1', '2026-06-10T00:00:00Z', ger, jpn), homeTeam: ger, awayTeam: jpn, result: null },
      { match: groupMatch('M2', '2026-06-15T00:00:00Z', jpn, ger), homeTeam: jpn, awayTeam: ger, result: null },
      { match: groupMatch('M3', '2026-06-20T00:00:00Z', ger, jpn), homeTeam: ger, awayTeam: jpn, result: null },
    ]
    const wrapper = mount(TeamSchedule, { props: { entries } })
    expect(wrapper.findAll('.team-schedule__stage').map((el) => el.text())).toEqual([
      'Gruppenspiel 3/3',
      'Gruppenspiel 2/3',
      'Gruppenspiel 1/3',
    ])
  })

  it('labels knockout-stage matches with their stage name, latest first', () => {
    const entries: TeamMatchEntry[] = [
      { match: knockoutMatch('M80', 'r32', '2026-07-01T00:00:00Z', ger), homeTeam: ger, awayTeam: null, result: null },
      {
        match: knockoutMatch('M104', 'final', '2026-07-19T00:00:00Z', ger),
        homeTeam: ger,
        awayTeam: null,
        result: null,
      },
    ]
    const wrapper = mount(TeamSchedule, { props: { entries } })
    expect(wrapper.findAll('.team-schedule__stage').map((el) => el.text())).toEqual(['Finale', 'Runde der 32'])
  })

  it('passes a placeholder label for the side that has not resolved yet', () => {
    const entries: TeamMatchEntry[] = [
      { match: knockoutMatch('M80', 'r32', '2026-07-01T00:00:00Z', ger), homeTeam: ger, awayTeam: null, result: null },
    ]
    const wrapper = mount(TeamSchedule, { props: { entries } })
    const card = wrapper.findComponent(MatchCard)
    // homeTeam is resolved, so MatchTeamSlot ignores homePlaceholder and shows the team instead
    expect(card.props('awayPlaceholder')).toBe('2. Gruppe C')
  })

  describe('score dialog', () => {
    const playedMatch = groupMatch('M1', '2026-06-10T00:00:00Z', ger, jpn)
    const entries: TeamMatchEntry[] = [
      { match: playedMatch, homeTeam: ger, awayTeam: jpn, result: makeResult('M1', 2, 1) },
    ]

    it('does not show the score dialog on mount', () => {
      const wrapper = mount(TeamSchedule, { props: { entries } })
      expect(wrapper.findComponent(ScoreDialog).exists()).toBe(false)
    })

    it('opens the score dialog for the clicked match with both teams resolved', async () => {
      const wrapper = mount(TeamSchedule, { props: { entries } })
      await wrapper.find('.match-card__body').trigger('click')
      const dialog = wrapper.findComponent(ScoreDialog)
      expect(dialog.exists()).toBe(true)
      expect(dialog.props('match')).toMatchObject({ id: 'M1' })
      expect(dialog.props('homeTeam')).toEqual(ger)
      expect(dialog.props('awayTeam')).toEqual(jpn)
    })

    it('closes the score dialog when it emits "close"', async () => {
      const wrapper = mount(TeamSchedule, { props: { entries } })
      await wrapper.find('.match-card__body').trigger('click')
      await wrapper.find('dialog').trigger('close')
      expect(wrapper.findComponent(ScoreDialog).exists()).toBe(false)
    })

    it('does not open the score dialog when the other side has not resolved yet', async () => {
      const unresolvedEntries: TeamMatchEntry[] = [
        {
          match: knockoutMatch('M80', 'r32', '2026-07-01T00:00:00Z', ger),
          homeTeam: ger,
          awayTeam: null,
          result: null,
        },
      ]
      const wrapper = mount(TeamSchedule, { props: { entries: unresolvedEntries } })
      await wrapper.find('.match-card__body').trigger('click')
      expect(wrapper.findComponent(ScoreDialog).exists()).toBe(false)
    })
  })
})
