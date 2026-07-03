import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TeamDialog from './TeamDialog.vue'
import MatchCard from './MatchCard.vue'
import type { Team, Player } from '../types/tournament'
import { makeTeam } from '../test-support/teams'

const { players } = vi.hoisted(() => {
  const hoistedPlayers: Player[] = [
    { number: 1, name: 'Manuel Neuer', position: 'GK' },
    { number: 4, name: 'Jonathan Tah', position: 'DF' },
    { number: 8, name: 'Toni Kroos', position: 'MF' },
  ]
  return { players: hoistedPlayers }
})

vi.mock('../data/squads', () => ({ squads: { ger: players } }))

beforeEach(() => {
  setActivePinia(createPinia())
  HTMLDialogElement.prototype.showModal = vi.fn()
  HTMLDialogElement.prototype.close = vi.fn().mockImplementation(function (this: HTMLDialogElement) {
    this.dispatchEvent(new Event('close'))
  })
})

const team = makeTeam({ id: 'ger', name: 'Deutschland', flagCode: 'de', fifaRanking: 14 })

function mountDialog(overrides: { team?: Team } = {}) {
  return mount(TeamDialog, { props: { team, ...overrides } })
}

describe('TeamDialog', () => {
  it('sets aria-label to the team name on the dialog element', () => {
    const wrapper = mountDialog()
    expect(wrapper.find('dialog').attributes('aria-label')).toBe('Deutschland')
  })

  it('renders the team name in the heading', () => {
    const wrapper = mountDialog()
    expect(wrapper.find('.team-dialog__title').text()).toBe('Deutschland')
  })

  it('renders the FIFA ranking', () => {
    const wrapper = mountDialog()
    expect(wrapper.find('.team-dialog__ranking').text()).toBe('FIFA-Ranking: 14')
  })

  it('renders the team flag with the correct flag code', () => {
    const wrapper = mountDialog()
    expect(wrapper.find('.fi-de').exists()).toBe(true)
  })

  it('emits close when the dialog fires its close event', async () => {
    const wrapper = mountDialog()
    await wrapper.find('dialog').trigger('close')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  describe('team tab', () => {
    it('is shown by default', () => {
      const wrapper = mountDialog()
      const teamTab = wrapper.find('#team-dialog-tab-team')
      const scheduleTab = wrapper.find('#team-dialog-tab-schedule')
      expect(teamTab.attributes('aria-selected')).toBe('true')
      expect(scheduleTab.attributes('aria-selected')).toBe('false')
      expect(wrapper.find('#team-dialog-panel-team').isVisible()).toBe(true)
      expect(wrapper.find('#team-dialog-panel-schedule').isVisible()).toBe(false)
    })

    it('renders a row for each player in the squad list', () => {
      const wrapper = mountDialog()
      expect(wrapper.findAll('.squad-list__row')).toHaveLength(3)
    })

    it('renders the overall stats table', () => {
      const wrapper = mountDialog()
      expect(wrapper.find('.team-stats').exists()).toBe(true)
    })
  })

  describe('schedule tab', () => {
    it('switches panels when clicked', async () => {
      const wrapper = mountDialog()
      await wrapper.find('#team-dialog-tab-schedule').trigger('click')
      expect(wrapper.find('#team-dialog-tab-schedule').attributes('aria-selected')).toBe('true')
      expect(wrapper.find('#team-dialog-panel-schedule').isVisible()).toBe(true)
      expect(wrapper.find('#team-dialog-panel-team').isVisible()).toBe(false)
    })

    it("renders a MatchCard for each of the team's group matches", async () => {
      const wrapper = mountDialog()
      await wrapper.find('#team-dialog-tab-schedule').trigger('click')
      expect(wrapper.findComponent(MatchCard).exists()).toBe(true)
      expect(wrapper.findAllComponents(MatchCard)).toHaveLength(3)
    })

    it('passes hide-link-icon to disable the connector icon and datetime toggle', async () => {
      const wrapper = mountDialog()
      await wrapper.find('#team-dialog-tab-schedule').trigger('click')
      for (const card of wrapper.findAllComponents(MatchCard)) {
        expect(card.props('hideLinkIcon')).toBe(true)
      }
    })
  })
})
