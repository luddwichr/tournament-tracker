// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GroupStandingsTable from './GroupStandingsTable.vue'
import StandingsRow from './StandingsRow.vue'
import type { TeamStat } from '../lib/standings'
import { teamsInGroup } from '../data/teams'
import { makeStat } from '../test-support/stats'

const standings: TeamStat[] = teamsInGroup('A').map((team, i) => makeStat({ points: (3 - i) * 3, team, wins: 3 - i }))

describe('GroupStandingsTable', () => {
  it('renders one StandingsRow per entry', () => {
    const wrapper = mount(GroupStandingsTable, { props: { groupDone: false, groupId: 'A', standings } })
    expect(wrapper.findAllComponents(StandingsRow)).toHaveLength(4)
  })

  it('passes 1-based rank to each row', () => {
    const wrapper = mount(GroupStandingsTable, { props: { groupDone: false, groupId: 'A', standings } })
    wrapper.findAllComponents(StandingsRow).forEach((row, i) => {
      expect(row.props('rank')).toBe(i + 1)
    })
  })

  it('passes groupDone through to each row', () => {
    const wrapper = mount(GroupStandingsTable, { props: { groupDone: true, groupId: 'A', standings } })
    wrapper.findAllComponents(StandingsRow).forEach((row) => {
      expect(row.props('groupDone')).toBe(true)
    })
  })

  it('renders all nine column headers in order, with abbreviations announced via abbr', () => {
    const wrapper = mount(GroupStandingsTable, { props: { groupDone: false, groupId: 'A', standings } })
    const headerCells = wrapper.findAll('th[scope="col"]')
    const abbreviations = headerCells.map((th) => (th.find('abbr').exists() ? th.get('abbr').text() : th.text()))
    expect(abbreviations).toEqual(['Team', 'Sp', 'S', 'U', 'N', 'T+', 'T-', 'TD', 'Pkt'])
  })

  it('gives each abbreviated header a visually-hidden full label', () => {
    const wrapper = mount(GroupStandingsTable, { props: { groupDone: false, groupId: 'A', standings } })
    const fullLabels = wrapper
      .findAll('th[scope="col"] abbr')
      .map((abbr) => abbr.element.nextElementSibling?.textContent)
    expect(fullLabels).toEqual([
      'Spiele',
      'Siege',
      'Unentschieden',
      'Niederlagen',
      'Tore',
      'Gegentore',
      'Tordifferenz',
      'Punkte',
    ])
  })

  it('renders a caption naming the group', () => {
    const wrapper = mount(GroupStandingsTable, { props: { groupDone: false, groupId: 'A', standings } })
    expect(wrapper.find('caption').text()).toBe('Tabelle Gruppe A')
  })

  it('renders an empty body when standings is empty', () => {
    const wrapper = mount(GroupStandingsTable, { props: { groupDone: false, groupId: 'A', standings: [] } })
    expect(wrapper.findAllComponents(StandingsRow)).toHaveLength(0)
  })
})
