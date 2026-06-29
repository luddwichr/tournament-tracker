import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SquadDialog from './SquadDialog.vue'
import type { Team, Player } from '../types/tournament'

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn()
  HTMLDialogElement.prototype.close = vi.fn().mockImplementation(function (this: HTMLDialogElement) {
    this.dispatchEvent(new Event('close'))
  })
})

const team: Team = {
  id: 'ger',
  name: 'Deutschland',
  flagCode: 'de',
  group: 'A',
  fifaRanking: 14,
}

const players: Player[] = [
  { number: 1, name: 'Manuel Neuer', position: 'GK' },
  { number: 4, name: 'Jonathan Tah', position: 'DF' },
  { number: 8, name: 'Toni Kroos', position: 'MF' },
]

function mountDialog(overrides: { team?: Team; players?: Player[] } = {}) {
  return mount(SquadDialog, { props: { team, players, ...overrides } })
}

describe('SquadDialog', () => {
  it('sets aria-label to "Kader: <team name>" on the dialog element', () => {
    const wrapper = mountDialog()
    expect(wrapper.find('dialog').attributes('aria-label')).toBe('Kader: Deutschland')
  })

  it('renders the team name in the heading', () => {
    const wrapper = mountDialog()
    expect(wrapper.find('.squad-dialog__title').text()).toBe('Deutschland')
  })

  it('renders the FIFA ranking', () => {
    const wrapper = mountDialog()
    expect(wrapper.find('.squad-dialog__ranking').text()).toBe('FIFA-Ranking: 14')
  })

  it('renders the team flag with the correct flag code', () => {
    const wrapper = mountDialog()
    expect(wrapper.find('.fi-de').exists()).toBe(true)
  })

  it('renders a row for each player in the squad list', () => {
    const wrapper = mountDialog()
    expect(wrapper.findAll('.squad-list__row')).toHaveLength(3)
  })

  it('emits close when the dialog fires its close event', async () => {
    const wrapper = mountDialog()
    await wrapper.find('dialog').trigger('close')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
