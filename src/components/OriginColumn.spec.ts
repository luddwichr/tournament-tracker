// @vitest-environment jsdom
import type { GroupId, Team } from '../types/tournament'
import OriginColumn, { type OriginGroupData, type OriginTeamRow } from './OriginColumn.vue'
import { describe, expect, it } from 'vitest'
import { GROUP_IDS } from '../types/tournament'
import { mount } from '@vue/test-utils'

function makeTeam(id: string, group: GroupId): Team {
  return { fifaRanking: 1, flagCode: id.slice(0, 2), group, id, name: id.toUpperCase() }
}

function makeRow(id: string, group: GroupId, rank: number, refKey: string | null, eliminated = false): OriginTeamRow {
  return { eliminated, rank, refKey, team: makeTeam(id, group) }
}

/** 12 groups, 3 rows each; rank-3 row has no refKey (group stage incomplete). */
function incompleteGroupData(): OriginGroupData[] {
  return GROUP_IDS.map((id) => ({
    id,
    teams: [
      makeRow(`${id}1`, id, 1, `groupRank:${id}:1`),
      makeRow(`${id}2`, id, 2, `groupRank:${id}:2`),
      makeRow(`${id}3`, id, 3, null),
    ],
  }))
}

/** All groups complete: the first 8 groups' third-place row gets a thirdPlace slot, the rest are eliminated. */
function completeGroupData(): OriginGroupData[] {
  return GROUP_IDS.map((id, i) => {
    const qualifies = i < 8
    return {
      id,
      teams: [
        makeRow(`${id}1`, id, 1, `groupRank:${id}:1`),
        makeRow(`${id}2`, id, 2, `groupRank:${id}:2`),
        makeRow(`${id}3`, id, 3, qualifies ? `thirdPlace:${i + 1}` : null, !qualifies),
      ],
    }
  })
}

describe('OriginColumn', () => {
  it('renders 12 group sections', () => {
    const wrapper = mount(OriginColumn, { props: { groupData: incompleteGroupData() } })
    expect(wrapper.findAll('.origin-column__group')).toHaveLength(12)
  })

  it('renders 3 team rows per group', () => {
    const wrapper = mount(OriginColumn, { props: { groupData: incompleteGroupData() } })
    for (const group of wrapper.findAll('.origin-column__group')) {
      expect(group.findAll('.origin-column__team-row')).toHaveLength(3)
    }
  })

  it('rank-1 row of group A has refKey groupRank:A:1', () => {
    const wrapper = mount(OriginColumn, { props: { groupData: incompleteGroupData() } })
    const rows = wrapper.findAll('.origin-column__group')[0]!.findAll('.origin-column__team-row')
    expect(rows[0]!.attributes('data-ref-key')).toBe('groupRank:A:1')
  })

  it('rank-2 row of group A has refKey groupRank:A:2', () => {
    const wrapper = mount(OriginColumn, { props: { groupData: incompleteGroupData() } })
    const rows = wrapper.findAll('.origin-column__group')[0]!.findAll('.origin-column__team-row')
    expect(rows[1]!.attributes('data-ref-key')).toBe('groupRank:A:2')
  })

  it('rank-3 row has no refKey when groups are not complete', () => {
    const wrapper = mount(OriginColumn, { props: { groupData: incompleteGroupData() } })
    const rows = wrapper.findAll('.origin-column__group')[0]!.findAll('.origin-column__team-row')
    expect(rows[2]!.attributes('data-ref-key')).toBeUndefined()
  })

  it('rank-3 rows have no-link class when groups are not complete', () => {
    const wrapper = mount(OriginColumn, { props: { groupData: incompleteGroupData() } })
    for (const group of wrapper.findAll('.origin-column__group')) {
      const thirdRow = group.findAll('.origin-column__team-row')[2]!
      expect(thirdRow.classes()).toContain('origin-column__team-row--no-link')
    }
  })

  it('exactly 8 third-place rows get a thirdPlace refKey when all groups are complete', () => {
    const wrapper = mount(OriginColumn, { props: { groupData: completeGroupData() } })
    const thirdRows = wrapper.findAll('.origin-column__team-row--third')
    const withSlot = thirdRows.filter((r) => r.attributes('data-ref-key')?.startsWith('thirdPlace:'))
    expect(withSlot).toHaveLength(8)
  })

  it('exactly 4 third-place rows are eliminated when all groups are complete', () => {
    const wrapper = mount(OriginColumn, { props: { groupData: completeGroupData() } })
    expect(wrapper.findAll('.origin-column__team-row--eliminated')).toHaveLength(4)
  })

  it('eliminated rows show a visually-hidden "(ausgeschieden)" label', () => {
    const wrapper = mount(OriginColumn, { props: { groupData: completeGroupData() } })
    for (const row of wrapper.findAll('.origin-column__team-row--eliminated')) {
      expect(row.find('.visually-hidden').text()).toBe('(ausgeschieden)')
    }
  })

  it('mouseenter on a row with refKey emits teamRefHover with that refKey', async () => {
    const wrapper = mount(OriginColumn, { props: { groupData: incompleteGroupData() } })
    await wrapper.findAll('.origin-column__team-row')[0]!.trigger('mouseenter')
    expect(wrapper.emitted('teamRefHover')).toEqual([['groupRank:A:1']])
  })

  it('mouseleave emits teamRefHoverEnd', async () => {
    const wrapper = mount(OriginColumn, { props: { groupData: incompleteGroupData() } })
    await wrapper.findAll('.origin-column__team-row')[0]!.trigger('mouseleave')
    expect(wrapper.emitted('teamRefHoverEnd')).toHaveLength(1)
  })

  it('applies highlight-ring when refKey is in highlightedRefs', () => {
    const wrapper = mount(OriginColumn, {
      props: { groupData: incompleteGroupData(), highlightedRefs: ['groupRank:A:1'] },
    })
    expect(wrapper.findAll('.origin-column__team-row')[0]!.classes()).toContain('highlight-ring')
  })

  it('does not apply highlight-ring when refKey is not in highlightedRefs', () => {
    const wrapper = mount(OriginColumn, {
      props: { groupData: incompleteGroupData(), highlightedRefs: ['groupRank:B:1'] },
    })
    expect(wrapper.findAll('.origin-column__team-row')[0]!.classes()).not.toContain('highlight-ring')
  })

  it('rows are not focusable (no tabindex), since they have no keyboard-actionable behavior', () => {
    const wrapper = mount(OriginColumn, { props: { groupData: incompleteGroupData() } })
    for (const row of wrapper.findAll('.origin-column__team-row')) {
      expect(row.attributes('tabindex')).toBeUndefined()
    }
  })

  it('rows with a refKey show a link icon', () => {
    const wrapper = mount(OriginColumn, { props: { groupData: incompleteGroupData() } })
    const rows = wrapper.findAll('.origin-column__group')[0]!.findAll('.origin-column__team-row')
    expect(rows[0]!.find('.origin-column__link-icon').exists()).toBe(true)
    expect(rows[1]!.find('.origin-column__link-icon').exists()).toBe(true)
  })

  it('rank-3 row has no link icon when groups are not complete', () => {
    const wrapper = mount(OriginColumn, { props: { groupData: incompleteGroupData() } })
    const rows = wrapper.findAll('.origin-column__group')[0]!.findAll('.origin-column__team-row')
    expect(rows[2]!.find('.origin-column__link-icon').exists()).toBe(false)
  })

  it('group labels read "Gruppe A" through "Gruppe L"', () => {
    const wrapper = mount(OriginColumn, { props: { groupData: incompleteGroupData() } })
    const labels = wrapper.findAll('.origin-column__group-label').map((el) => el.text())
    expect(labels[0]).toBe('Gruppe A')
    expect(labels[11]).toBe('Gruppe L')
  })
})
