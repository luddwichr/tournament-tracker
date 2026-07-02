import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import OriginColumn from './OriginColumn.vue'
import { useTournamentStore } from '../stores/tournament'
import { allGroupResults } from '../test-support/results'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('OriginColumn', () => {
  it('renders 12 group sections', () => {
    const wrapper = mount(OriginColumn)
    expect(wrapper.findAll('.origin-column__group')).toHaveLength(12)
  })

  it('renders 3 team rows per group', () => {
    const wrapper = mount(OriginColumn)
    for (const group of wrapper.findAll('.origin-column__group')) {
      expect(group.findAll('.origin-column__team-row')).toHaveLength(3)
    }
  })

  it('rank-1 row of group A has refKey groupRank:A:1', () => {
    const wrapper = mount(OriginColumn)
    const rows = wrapper.findAll('.origin-column__group')[0]!.findAll('.origin-column__team-row')
    expect(rows[0]!.attributes('data-ref-key')).toBe('groupRank:A:1')
  })

  it('rank-2 row of group A has refKey groupRank:A:2', () => {
    const wrapper = mount(OriginColumn)
    const rows = wrapper.findAll('.origin-column__group')[0]!.findAll('.origin-column__team-row')
    expect(rows[1]!.attributes('data-ref-key')).toBe('groupRank:A:2')
  })

  it('rank-3 row has no refKey when groups are not complete', () => {
    const wrapper = mount(OriginColumn)
    const rows = wrapper.findAll('.origin-column__group')[0]!.findAll('.origin-column__team-row')
    expect(rows[2]!.attributes('data-ref-key')).toBeUndefined()
  })

  it('rank-3 rows have no-link class when groups are not complete', () => {
    const wrapper = mount(OriginColumn)
    for (const group of wrapper.findAll('.origin-column__group')) {
      const thirdRow = group.findAll('.origin-column__team-row')[2]!
      expect(thirdRow.classes()).toContain('origin-column__team-row--no-link')
    }
  })

  it('exactly 8 third-place rows get a thirdPlace refKey when all groups are complete', async () => {
    useTournamentStore().importResults(allGroupResults(1, 0))
    const wrapper = mount(OriginColumn)
    await wrapper.vm.$nextTick()
    const thirdRows = wrapper.findAll('.origin-column__team-row--third')
    const withSlot = thirdRows.filter((r) => r.attributes('data-ref-key')?.startsWith('thirdPlace:'))
    expect(withSlot).toHaveLength(8)
  })

  it('exactly 4 third-place rows are eliminated when all groups are complete', async () => {
    useTournamentStore().importResults(allGroupResults(1, 0))
    const wrapper = mount(OriginColumn)
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.origin-column__team-row--eliminated')).toHaveLength(4)
  })

  it('eliminated rows show a visually-hidden "(ausgeschieden)" label', async () => {
    useTournamentStore().importResults(allGroupResults(1, 0))
    const wrapper = mount(OriginColumn)
    await wrapper.vm.$nextTick()
    for (const row of wrapper.findAll('.origin-column__team-row--eliminated')) {
      expect(row.find('.visually-hidden').text()).toBe('(ausgeschieden)')
    }
  })

  it('mouseenter on a row with refKey emits teamRefHover with that refKey', async () => {
    const wrapper = mount(OriginColumn)
    await wrapper.findAll('.origin-column__team-row')[0]!.trigger('mouseenter')
    expect(wrapper.emitted('teamRefHover')).toEqual([['groupRank:A:1']])
  })

  it('mouseleave emits teamRefHoverEnd', async () => {
    const wrapper = mount(OriginColumn)
    await wrapper.findAll('.origin-column__team-row')[0]!.trigger('mouseleave')
    expect(wrapper.emitted('teamRefHoverEnd')).toHaveLength(1)
  })

  it('applies highlight-ring when refKey is in highlightedRefs', () => {
    const wrapper = mount(OriginColumn, { props: { highlightedRefs: ['groupRank:A:1'] } })
    expect(wrapper.findAll('.origin-column__team-row')[0]!.classes()).toContain('highlight-ring')
  })

  it('does not apply highlight-ring when refKey is not in highlightedRefs', () => {
    const wrapper = mount(OriginColumn, { props: { highlightedRefs: ['groupRank:B:1'] } })
    expect(wrapper.findAll('.origin-column__team-row')[0]!.classes()).not.toContain('highlight-ring')
  })

  it('focusin on a row with refKey emits teamRefHover with that refKey', async () => {
    const wrapper = mount(OriginColumn)
    await wrapper.findAll('.origin-column__team-row')[0]!.trigger('focusin')
    expect(wrapper.emitted('teamRefHover')).toEqual([['groupRank:A:1']])
  })

  it('focusin on a row without refKey does not emit teamRefHover', async () => {
    const wrapper = mount(OriginColumn)
    // rank-3 row has no refKey when groups are not complete
    await wrapper.findAll('.origin-column__team-row')[2]!.trigger('focusin')
    expect(wrapper.emitted('teamRefHover')).toBeUndefined()
  })

  it('focusout emits teamRefHoverEnd', async () => {
    const wrapper = mount(OriginColumn)
    await wrapper.findAll('.origin-column__team-row')[0]!.trigger('focusout')
    expect(wrapper.emitted('teamRefHoverEnd')).toHaveLength(1)
  })

  it('rows with a refKey show a link icon', () => {
    const wrapper = mount(OriginColumn)
    const rows = wrapper.findAll('.origin-column__group')[0]!.findAll('.origin-column__team-row')
    expect(rows[0]!.find('.origin-column__link-icon').exists()).toBe(true)
    expect(rows[1]!.find('.origin-column__link-icon').exists()).toBe(true)
  })

  it('rank-3 row has no link icon when groups are not complete', () => {
    const wrapper = mount(OriginColumn)
    const rows = wrapper.findAll('.origin-column__group')[0]!.findAll('.origin-column__team-row')
    expect(rows[2]!.find('.origin-column__link-icon').exists()).toBe(false)
  })

  it('group labels read "Gruppe A" through "Gruppe L"', () => {
    const wrapper = mount(OriginColumn)
    const labels = wrapper.findAll('.origin-column__group-label').map((el) => el.text())
    expect(labels[0]).toBe('Gruppe A')
    expect(labels[11]).toBe('Gruppe L')
  })
})
