// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { GROUP_IDS } from '../types/tournament'
import GroupTable from '../components/GroupTable.vue'
import GroupsView from './GroupsView.vue'
import ThirdPlaceTable from '../components/ThirdPlaceTable.vue'
import { allGroupResults } from '../test-support/results'
import { mount } from '@vue/test-utils'
import { rankThirdPlacedLive } from '../lib/third-place'
import { useTournamentStore } from '../stores/tournament'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('GroupsView', () => {
  it('renders the heading "Gruppen"', () => {
    const wrapper = mount(GroupsView)
    expect(wrapper.find('h1').text()).toBe('Gruppen')
  })

  it('renders one GroupTable per group', () => {
    const wrapper = mount(GroupsView)
    expect(wrapper.findAllComponents(GroupTable)).toHaveLength(GROUP_IDS.length)
  })

  it('passes each groupId prop to its GroupTable in order', () => {
    const wrapper = mount(GroupsView)
    const groupIds = wrapper.findAllComponents(GroupTable).map((t) => t.props('groupId'))
    expect(groupIds).toEqual([...GROUP_IDS])
  })

  it('renders the third-place table', () => {
    const wrapper = mount(GroupsView)
    expect(wrapper.findComponent(ThirdPlaceTable).exists()).toBe(true)
  })

  it('passes the live third-place ranking (computed from store.results) to ThirdPlaceTable', () => {
    const wrapper = mount(GroupsView)
    const liveRanking = wrapper.findComponent(ThirdPlaceTable).props('liveRanking') as ReturnType<
      typeof rankThirdPlacedLive
    >
    expect(liveRanking).toEqual(rankThirdPlacedLive({}))
    expect(liveRanking.final).toBe(false)
  })

  it('updates the liveRanking prop once all groups are complete', async () => {
    const store = useTournamentStore()
    const wrapper = mount(GroupsView)
    store.importResults(allGroupResults(1, 0))
    await wrapper.vm.$nextTick()
    const liveRanking = wrapper.findComponent(ThirdPlaceTable).props('liveRanking') as ReturnType<
      typeof rankThirdPlacedLive
    >
    expect(liveRanking.final).toBe(true)
  })
})
