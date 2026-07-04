// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GroupStandingsTable from './GroupStandingsTable.vue'
import StandingsRow from './StandingsRow.vue'
import type { TeamStat } from '../lib/standings'
import { teamsInGroup } from '../data/teams'
import { makeStat } from '../test-support/stats'

const standings: TeamStat[] = teamsInGroup('A').map((team, i) => makeStat({ team, wins: 3 - i, points: (3 - i) * 3 }))

describe('GroupStandingsTable', () => {
  it('renders one StandingsRow per entry', () => {
    const wrapper = mount(GroupStandingsTable, { props: { standings, groupDone: false } })
    expect(wrapper.findAllComponents(StandingsRow)).toHaveLength(4)
  })

  it('passes 1-based rank to each row', () => {
    const wrapper = mount(GroupStandingsTable, { props: { standings, groupDone: false } })
    wrapper.findAllComponents(StandingsRow).forEach((row, i) => {
      expect(row.props('rank')).toBe(i + 1)
    })
  })

  it('passes groupDone through to each row', () => {
    const wrapper = mount(GroupStandingsTable, { props: { standings, groupDone: true } })
    wrapper.findAllComponents(StandingsRow).forEach((row) => {
      expect(row.props('groupDone')).toBe(true)
    })
  })

  it('renders all nine column headers in order', () => {
    const wrapper = mount(GroupStandingsTable, { props: { standings, groupDone: false } })
    const headers = wrapper.findAll('th[scope="col"]').map((th) => th.text())
    expect(headers).toEqual(['Team', 'Sp', 'S', 'U', 'N', 'T+', 'T-', 'TD', 'Pkt'])
  })

  it('renders an empty body when standings is empty', () => {
    const wrapper = mount(GroupStandingsTable, { props: { standings: [], groupDone: false } })
    expect(wrapper.findAllComponents(StandingsRow)).toHaveLength(0)
  })
})
