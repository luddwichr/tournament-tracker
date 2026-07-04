// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SquadList from './SquadList.vue'
import type { Player } from '../types/tournament'

function makePlayer(overrides: Partial<Player> = {}): Player {
  return { number: 1, name: 'Max Mustermann', position: 'MF', ...overrides }
}

describe('SquadList', () => {
  it('renders a row for each player', () => {
    const players = [makePlayer({ number: 1 }), makePlayer({ number: 2 }), makePlayer({ number: 3 })]
    const wrapper = mount(SquadList, { props: { players } })
    expect(wrapper.findAll('.squad-list__row')).toHaveLength(3)
  })

  it('renders number, position label, and name in order', () => {
    const player = makePlayer({ number: 9, name: 'Karl Koch', position: 'FW' })
    const wrapper = mount(SquadList, { props: { players: [player] } })
    const row = wrapper.find('.squad-list__row')
    expect(row.find('.squad-list__num').text()).toBe('9')
    expect(row.find('.squad-list__pos').text()).toBe('Sturm')
    expect(row.find('.squad-list__name').text()).toBe('Karl Koch')
  })

  it.each([
    ['GK', 'Torwart'],
    ['DF', 'Abwehr'],
    ['MF', 'Mittelfeld'],
    ['FW', 'Sturm'],
  ] as const)('maps position %s to label "%s"', (position, label) => {
    const wrapper = mount(SquadList, { props: { players: [makePlayer({ position })] } })
    expect(wrapper.find('.squad-list__pos').text()).toBe(label)
  })

  it('sorts players GK → DF → MF → FW, then by number within the same position', () => {
    const players = [
      makePlayer({ number: 10, position: 'MF' }),
      makePlayer({ number: 1, position: 'GK' }),
      makePlayer({ number: 9, position: 'FW' }),
      makePlayer({ number: 4, position: 'DF' }),
      makePlayer({ number: 8, position: 'MF' }),
    ]
    const wrapper = mount(SquadList, { props: { players } })
    const nums = wrapper.findAll('.squad-list__num').map((td) => td.text())
    expect(nums).toEqual(['1', '4', '8', '10', '9'])
  })

  it('uses th[scope=row] for the player name cell', () => {
    const wrapper = mount(SquadList, { props: { players: [makePlayer()] } })
    const nameCell = wrapper.find('.squad-list__name')
    expect(nameCell.element.tagName).toBe('TH')
    expect(nameCell.attributes('scope')).toBe('row')
  })

  it('has a visually-hidden caption "Kader"', () => {
    const wrapper = mount(SquadList, { props: { players: [] } })
    expect(wrapper.find('caption').text()).toBe('Kader')
  })
})
