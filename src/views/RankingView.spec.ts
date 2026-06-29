import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RankingView from './RankingView.vue'
import { fifaRanking } from '../data/fifa-ranking'
import { teams } from '../data/teams'

describe('RankingView', () => {
  it('renders the page heading', () => {
    const wrapper = mount(RankingView)
    expect(wrapper.find('h1').text()).toBe('FIFA-Weltrangliste')
  })

  it('renders a row for every team in the FIFA ranking', () => {
    const wrapper = mount(RankingView)
    const rows = wrapper.findAll('.ranking-row')
    expect(rows).toHaveLength(fifaRanking.length)
  })

  it('applies ranking-row--wc class only to WC 2026 participant rows', () => {
    const wrapper = mount(RankingView)
    const wcRows = wrapper.findAll('.ranking-row--wc')
    expect(wcRows).toHaveLength(teams.length)
  })

  it('shows the correct total count in the subtitle', () => {
    const wrapper = mount(RankingView)
    const subtitle = wrapper.find('.ranking-view__subtitle').text()
    expect(subtitle).toContain(`${fifaRanking.length}`)
    expect(subtitle).toContain(`${teams.length}`)
  })

  it('renders the rank-1 team first', () => {
    const wrapper = mount(RankingView)
    const firstRow = wrapper.findAll('.ranking-row')[0]!
    const rank = firstRow.find('.ranking-row__rank').text().trim()
    expect(rank).toBe('1')
  })
})
