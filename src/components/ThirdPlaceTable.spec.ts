// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ThirdPlaceTable from './ThirdPlaceTable.vue'
import ThirdPlaceRow from './ThirdPlaceRow.vue'
import InfoDisclosure from './InfoDisclosure.vue'
import { rankThirdPlacedLive } from '../lib/third-place'
import { allGroupResults } from '../test-support/results'

describe('ThirdPlaceTable', () => {
  it('renders 12 rows, one per group', () => {
    const wrapper = mount(ThirdPlaceTable, { props: { liveRanking: rankThirdPlacedLive({}) } })
    expect(wrapper.findAllComponents(ThirdPlaceRow)).toHaveLength(12)
  })

  it('renders the tiebreaker columns in breaking order', () => {
    const wrapper = mount(ThirdPlaceTable, { props: { liveRanking: rankThirdPlacedLive({}) } })
    const headers = wrapper.findAll('th[scope="col"]').map((th) => th.text())
    expect(headers).toEqual(['Team', 'Pkt', 'TD', 'Tore', 'FP', 'FIFA'])
  })

  it('renders the title naming the qualifying count', () => {
    const wrapper = mount(ThirdPlaceTable, { props: { liveRanking: rankThirdPlacedLive({}) } })
    expect(wrapper.find('.third-place-table__title').text()).toBe('Die besten 8 Drittplatzierten')
  })

  it('passes 1-based rank to each row', () => {
    const wrapper = mount(ThirdPlaceTable, { props: { liveRanking: rankThirdPlacedLive({}) } })
    wrapper.findAllComponents(ThirdPlaceRow).forEach((row, i) => {
      expect(row.props('rank')).toBe(i + 1)
    })
  })

  it('passes final: false to every row before the group stage is complete', () => {
    const wrapper = mount(ThirdPlaceTable, { props: { liveRanking: rankThirdPlacedLive({}) } })
    wrapper.findAllComponents(ThirdPlaceRow).forEach((row) => {
      expect(row.props('final')).toBe(false)
    })
  })

  it('passes final: true to every row once all groups are complete', () => {
    const wrapper = mount(ThirdPlaceTable, {
      props: { liveRanking: rankThirdPlacedLive(allGroupResults(1, 0)) },
    })
    wrapper.findAllComponents(ThirdPlaceRow).forEach((row) => {
      expect(row.props('final')).toBe(true)
    })
  })

  it('renders the tiebreaker explainer disclosure before the table', () => {
    const wrapper = mount(ThirdPlaceTable, { props: { liveRanking: rankThirdPlacedLive({}) } })
    const info = wrapper.findComponent(InfoDisclosure)
    expect(info.exists()).toBe(true)
    expect(info.props('summary')).toBe('Wie wird das entschieden?')
    expect(info.text()).toContain('Punkte')
    expect(info.text()).toContain('Tordifferenz')
    expect(info.text()).toContain('Fair Play')
    expect(info.text()).toContain('FIFA-Weltrangliste')

    const html = wrapper.html()
    expect(html.indexOf('info-disclosure')).toBeLessThan(html.indexOf('<table'))
  })
})
