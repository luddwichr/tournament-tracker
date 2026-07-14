// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { GROUP_IDS } from '../types/tournament'
import type { GroupId } from '../types/tournament'
import GroupStandingsTable from './GroupStandingsTable.vue'
import GroupTable from './GroupTable.vue'
import MatchCard from './MatchCard.vue'
import { groupMatches } from '../data/fixtures-2026'
import { makeResult } from '../test-support/results'
import { mount } from '@vue/test-utils'
import { scoreDialogKey } from '../composables/use-score-dialog'
import { useTournamentStore } from '../stores/tournament'

vi.mock('../data/fixtures-2026', async (importOriginal) => {
  const original = await importOriginal<typeof import('../data/fixtures-2026')>()
  return {
    ...original,
    groupMatches: [
      ...original.groupMatches,
      // Unknown teamId: covers the `?? null` branch in resolveTeam. (A
      // non-team-kind ref in a group match is no longer representable —
      // `GroupMatchSlot`/`ResolvedTeamRef` rule it out at the type level.)
      {
        awayRef: { kind: 'team' as const, teamId: 'UNKNOWN_ABC' },
        group: 'C' as const,
        homeRef: { kind: 'team' as const, teamId: 'UNKNOWN_XYZ' },
        id: 'MOCK_UNKNOWN_TEAM',
        kickoff: '2026-06-01T19:00:00+00:00',
        stage: 'group' as const,
      },
    ],
  }
})

beforeEach(() => {
  setActivePinia(createPinia())
})

function mountGroupTable(groupId: GroupId, openScoreDialog = vi.fn()) {
  const wrapper = mount(GroupTable, {
    global: { provide: { [scoreDialogKey as symbol]: openScoreDialog } },
    props: { groupId },
  })
  return { openScoreDialog, wrapper }
}

describe('GroupTable – layout', () => {
  it('renders the group title', () => {
    const { wrapper } = mountGroupTable('A')
    expect(wrapper.find('.group-table__title').text()).toBe('Gruppe A')
  })

  it('renders the correct group title for a different group', () => {
    const { wrapper } = mountGroupTable('E')
    expect(wrapper.find('.group-table__title').text()).toBe('Gruppe E')
  })

  it('renders the standings table', () => {
    const { wrapper } = mountGroupTable('A')
    expect(wrapper.findComponent(GroupStandingsTable).exists()).toBe(true)
  })

  it('passes the groupId prop through to the standings table', () => {
    const { wrapper } = mountGroupTable('E')
    expect(wrapper.findComponent(GroupStandingsTable).props('groupId')).toBe('E')
  })

  it('renders one MatchCard per match in the group', () => {
    const { wrapper } = mountGroupTable('A')
    const expected = groupMatches.filter((m) => m.group === 'A').length
    expect(wrapper.findAllComponents(MatchCard)).toHaveLength(expected)
  })

  it('renders all MatchCards as static', () => {
    const { wrapper } = mountGroupTable('A')
    const cards = wrapper.findAllComponents(MatchCard)
    expect(cards.every((c) => c.props('static') === true)).toBe(true)
  })
})

describe('GroupTable – score dialog', () => {
  it('does not call the score dialog opener on mount', () => {
    const { openScoreDialog } = mountGroupTable('A')
    expect(openScoreDialog).not.toHaveBeenCalled()
  })

  it('calls the score dialog opener with the clicked match and resolved teams', async () => {
    const { wrapper, openScoreDialog } = mountGroupTable('A')
    const firstMatch = groupMatches.find((m) => m.group === 'A')!
    await wrapper.find('.match-card__body').trigger('click')
    expect(openScoreDialog).toHaveBeenCalledOnce()
    const [match, home, away] = openScoreDialog.mock.calls[0]!
    expect(match).toMatchObject({ id: firstMatch.id })
    expect(home).toBeTruthy()
    expect(away).toBeTruthy()
  })
})

describe('GroupTable – store.standingsByGroup getter', () => {
  it('exposes a Map with an entry for every group', () => {
    const store = useTournamentStore()
    expect(store.standingsByGroup.size).toBe(GROUP_IDS.length)
    for (const id of GROUP_IDS) {
      expect(store.standingsByGroup.get(id)).toBeDefined()
    }
  })

  it('reflects newly entered results', () => {
    const store = useTournamentStore()
    const before = store.standingsByGroup.get('A')!
    expect(before.every((s) => s.played === 0)).toBe(true)

    const firstMatch = groupMatches.find((m) => m.group === 'A')!
    store.enterResult(makeResult(firstMatch.id, 2, 0))

    const after = store.standingsByGroup.get('A')!
    expect(after.some((s) => s.played === 1)).toBe(true)
  })

  it('GroupTable renders standings sourced from store.standingsByGroup (not a fresh computation)', () => {
    const store = useTournamentStore()
    const wrapper = mount(GroupTable, { props: { groupId: 'A' } })
    const table = wrapper.findComponent(GroupStandingsTable)
    expect(table.props('standings')).toBe(store.standingsByGroup.get('A'))
  })
})

describe('GroupTable – resolveTeam null branch', () => {
  it('does not call the score dialog opener when team refs have an unknown teamId', async () => {
    const { wrapper, openScoreDialog } = mountGroupTable('C')
    const cards = wrapper.findAllComponents(MatchCard)
    // the injected unknown-teamId match is appended last in group C
    await cards[cards.length - 1]!.find('.match-card__body').trigger('click')
    expect(openScoreDialog).not.toHaveBeenCalled()
  })
})
