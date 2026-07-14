// @vitest-environment jsdom
import type { GroupMatchSlot, KnockoutMatchSlot, Team } from '../types/tournament'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import MatchCard from './MatchCard.vue'
import type { TeamMatchEntry } from '../lib/team-schedule'
import TeamSchedule from './TeamSchedule.vue'
import { makeResult } from '../test-support/results'
import { makeTeam } from '../test-support/teams'
import { mount } from '@vue/test-utils'
import { scoreDialogKey } from '../composables/use-score-dialog'

beforeEach(() => {
  setActivePinia(createPinia())
})

const ger = makeTeam({ id: 'ger', name: 'Deutschland' })
const jpn = makeTeam({ id: 'jpn', name: 'Japan' })

function groupMatch(id: string, kickoff: string, home: Team, away: Team): GroupMatchSlot {
  return {
    awayRef: { kind: 'team', teamId: away.id },
    group: 'A',
    homeRef: { kind: 'team', teamId: home.id },
    id,
    kickoff,
    stage: 'group',
  }
}

function knockoutMatch(
  id: string,
  stage: KnockoutMatchSlot['stage'],
  kickoff: string,
  home: Team | null,
): KnockoutMatchSlot {
  return {
    awayRef: { group: 'C', kind: 'groupRank', rank: 2 },
    homeRef: home ? { kind: 'team', teamId: home.id } : { group: 'B', kind: 'groupRank', rank: 1 },
    id,
    kickoff,
    stage,
  }
}

function mountSchedule(rows: TeamMatchEntry[], openScoreDialog = vi.fn()) {
  const wrapper = mount(TeamSchedule, {
    global: { provide: { [scoreDialogKey as symbol]: openScoreDialog } },
    props: { entries: rows },
  })
  return { openScoreDialog, wrapper }
}

describe('TeamSchedule', () => {
  it('shows an empty-state message when there are no entries', () => {
    const wrapper = mount(TeamSchedule, { props: { entries: [] } })
    expect(wrapper.find('.team-schedule__empty').exists()).toBe(true)
    expect(wrapper.findComponent(MatchCard).exists()).toBe(false)
  })

  it('renders a MatchCard per entry, latest kickoff first, as plain', () => {
    const entries: TeamMatchEntry[] = [
      { awayTeam: jpn, homeTeam: ger, match: groupMatch('M2', '2026-06-15T00:00:00Z', ger, jpn), result: null },
      { awayTeam: jpn, homeTeam: ger, match: groupMatch('M1', '2026-06-10T00:00:00Z', ger, jpn), result: null },
    ]
    const wrapper = mount(TeamSchedule, { props: { entries } })
    const cards = wrapper.findAllComponents(MatchCard)
    expect(cards.map((c) => c.props('match').id)).toEqual(['M2', 'M1'])
    expect(cards.every((c) => c.props('plain') === true)).toBe(true)
  })

  it('numbers group matches "Gruppenspiel n/3" per team chronologically, but lists them latest-first', () => {
    const entries: TeamMatchEntry[] = [
      { awayTeam: jpn, homeTeam: ger, match: groupMatch('M1', '2026-06-10T00:00:00Z', ger, jpn), result: null },
      { awayTeam: ger, homeTeam: jpn, match: groupMatch('M2', '2026-06-15T00:00:00Z', jpn, ger), result: null },
      { awayTeam: jpn, homeTeam: ger, match: groupMatch('M3', '2026-06-20T00:00:00Z', ger, jpn), result: null },
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
      { awayTeam: null, homeTeam: ger, match: knockoutMatch('M80', 'r32', '2026-07-01T00:00:00Z', ger), result: null },
      {
        awayTeam: null,
        homeTeam: ger,
        match: knockoutMatch('M104', 'final', '2026-07-19T00:00:00Z', ger),
        result: null,
      },
    ]
    const wrapper = mount(TeamSchedule, { props: { entries } })
    expect(wrapper.findAll('.team-schedule__stage').map((el) => el.text())).toEqual(['Finale', 'Runde der 32'])
  })

  it('passes a placeholder label for the side that has not resolved yet', () => {
    const entries: TeamMatchEntry[] = [
      { awayTeam: null, homeTeam: ger, match: knockoutMatch('M80', 'r32', '2026-07-01T00:00:00Z', ger), result: null },
    ]
    const wrapper = mount(TeamSchedule, { props: { entries } })
    const card = wrapper.findComponent(MatchCard)
    // homeTeam is resolved, so MatchTeamSlot ignores homePlaceholder and shows the team instead
    expect(card.props('awayPlaceholder')).toBe('2. Gruppe C')
  })

  describe('score dialog', () => {
    const playedMatch = groupMatch('M1', '2026-06-10T00:00:00Z', ger, jpn)
    const entries: TeamMatchEntry[] = [
      { awayTeam: jpn, homeTeam: ger, match: playedMatch, result: makeResult('M1', 2, 1) },
    ]

    it('does not call the score dialog opener on mount', () => {
      const { openScoreDialog } = mountSchedule(entries)
      expect(openScoreDialog).not.toHaveBeenCalled()
    })

    it('calls the score dialog opener for the clicked match with both teams resolved', async () => {
      const { wrapper, openScoreDialog } = mountSchedule(entries)
      await wrapper.find('.match-card__body').trigger('click')
      expect(openScoreDialog).toHaveBeenCalledOnce()
      expect(openScoreDialog).toHaveBeenCalledWith(playedMatch, ger, jpn)
    })

    it('does not call the score dialog opener when the other side has not resolved yet', async () => {
      const unresolvedEntries: TeamMatchEntry[] = [
        {
          awayTeam: null,
          homeTeam: ger,
          match: knockoutMatch('M80', 'r32', '2026-07-01T00:00:00Z', ger),
          result: null,
        },
      ]
      const { wrapper, openScoreDialog } = mountSchedule(unresolvedEntries)
      await wrapper.find('.match-card__body').trigger('click')
      expect(openScoreDialog).not.toHaveBeenCalled()
    })
  })
})
