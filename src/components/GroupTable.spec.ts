import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import GroupTable from './GroupTable.vue'
import MatchCard from './MatchCard.vue'
import GroupStandingsTable from './GroupStandingsTable.vue'
import ScoreDialog from './ScoreDialog.vue'
import { groupMatches } from '../data/fixtures-2026'

beforeEach(() => {
  setActivePinia(createPinia())
  HTMLDialogElement.prototype.showModal = vi.fn()
  HTMLDialogElement.prototype.close = vi.fn().mockImplementation(function (this: HTMLDialogElement) {
    this.dispatchEvent(new Event('close'))
  })
})

describe('GroupTable – layout', () => {
  it('renders the group title', () => {
    const wrapper = mount(GroupTable, { props: { groupId: 'A' } })
    expect(wrapper.find('.group-table__title').text()).toBe('Gruppe A')
  })

  it('renders the correct group title for a different group', () => {
    const wrapper = mount(GroupTable, { props: { groupId: 'E' } })
    expect(wrapper.find('.group-table__title').text()).toBe('Gruppe E')
  })

  it('renders the standings table', () => {
    const wrapper = mount(GroupTable, { props: { groupId: 'A' } })
    expect(wrapper.findComponent(GroupStandingsTable).exists()).toBe(true)
  })

  it('renders one MatchCard per match in the group', () => {
    const wrapper = mount(GroupTable, { props: { groupId: 'A' } })
    const expected = groupMatches.filter((m) => m.group === 'A').length
    expect(wrapper.findAllComponents(MatchCard)).toHaveLength(expected)
  })

  it('renders all MatchCards with hideLinkIcon', () => {
    const wrapper = mount(GroupTable, { props: { groupId: 'A' } })
    const cards = wrapper.findAllComponents(MatchCard)
    expect(cards.every((c) => c.props('hideLinkIcon') === true)).toBe(true)
  })
})

describe('GroupTable – score dialog', () => {
  it('does not show the score dialog on mount', () => {
    const wrapper = mount(GroupTable, { props: { groupId: 'A' } })
    expect(wrapper.findComponent(ScoreDialog).exists()).toBe(false)
  })

  it('shows the score dialog after clicking a match card body', async () => {
    const wrapper = mount(GroupTable, { props: { groupId: 'A' } })
    await wrapper.find('.match-card__body').trigger('click')
    expect(wrapper.findComponent(ScoreDialog).exists()).toBe(true)
  })

  it('hides the score dialog after it emits "close"', async () => {
    const wrapper = mount(GroupTable, { props: { groupId: 'A' } })
    await wrapper.find('.match-card__body').trigger('click')
    expect(wrapper.findComponent(ScoreDialog).exists()).toBe(true)
    await wrapper.find('dialog').trigger('close')
    expect(wrapper.findComponent(ScoreDialog).exists()).toBe(false)
  })

  it('wires the correct match into the score dialog', async () => {
    const wrapper = mount(GroupTable, { props: { groupId: 'A' } })
    const firstMatch = groupMatches.find((m) => m.group === 'A')!
    await wrapper.find('.match-card__body').trigger('click')
    expect(wrapper.findComponent(ScoreDialog).props('match')).toMatchObject({ id: firstMatch.id })
  })
})
