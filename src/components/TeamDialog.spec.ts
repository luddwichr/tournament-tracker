// @vitest-environment jsdom
import type { Player, Team } from '../types/tournament'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import MatchCard from './MatchCard.vue'
import TeamDialog from './TeamDialog.vue'
import { makeTeam } from '../test-support/teams'
import { mount } from '@vue/test-utils'

const { players } = vi.hoisted(() => {
  const hoistedPlayers: Player[] = [
    { name: 'Manuel Neuer', number: 1, position: 'GK' },
    { name: 'Jonathan Tah', number: 4, position: 'DF' },
    { name: 'Toni Kroos', number: 8, position: 'MF' },
  ]
  return { players: hoistedPlayers }
})

vi.mock('../data/squads', () => ({
  squadFor: (teamId: string) => (teamId === 'ger' ? players : []),
  squads: { ger: players },
}))

beforeEach(() => {
  setActivePinia(createPinia())
})

const team = makeTeam({ fifaRanking: 14, flagCode: 'de', id: 'ger', name: 'Deutschland' })

function mountDialog(overrides: { team?: Team } = {}, attachToDocument = false) {
  return mount(TeamDialog, {
    props: { team, ...overrides },
    ...(attachToDocument ? { attachTo: document.body } : {}),
  })
}

function tabs(wrapper: ReturnType<typeof mountDialog>) {
  return wrapper.findAll('[role="tab"]')
}

function panels(wrapper: ReturnType<typeof mountDialog>) {
  return wrapper.findAll('[role="tabpanel"]')
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

  it('gives each tab/panel pair stable, unique, and correlated ids', () => {
    const wrapper = mountDialog()
    const [teamTab, scheduleTab] = tabs(wrapper)
    const [teamPanel, schedulePanel] = panels(wrapper)
    expect(teamTab!.attributes('id')).toBeTruthy()
    expect(scheduleTab!.attributes('id')).toBeTruthy()
    expect(teamTab!.attributes('id')).not.toBe(scheduleTab!.attributes('id'))
    expect(teamTab!.attributes('aria-controls')).toBe(teamPanel!.attributes('id'))
    expect(scheduleTab!.attributes('aria-controls')).toBe(schedulePanel!.attributes('id'))
    expect(teamPanel!.attributes('aria-labelledby')).toBe(teamTab!.attributes('id'))
    expect(schedulePanel!.attributes('aria-labelledby')).toBe(scheduleTab!.attributes('id'))
  })

  describe('team tab', () => {
    it('is shown by default', () => {
      const wrapper = mountDialog()
      const [teamTab, scheduleTab] = tabs(wrapper)
      const [teamPanel, schedulePanel] = panels(wrapper)
      expect(teamTab!.attributes('aria-selected')).toBe('true')
      expect(scheduleTab!.attributes('aria-selected')).toBe('false')
      expect(teamPanel!.isVisible()).toBe(true)
      expect(schedulePanel!.isVisible()).toBe(false)
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

  describe('keyboard navigation', () => {
    it('moves focus and selection to the next tab on ArrowRight, wrapping at the end', async () => {
      const wrapper = mountDialog({}, true)
      const [teamTab, scheduleTab] = tabs(wrapper)

      await teamTab!.trigger('keydown', { key: 'ArrowRight' })

      expect(scheduleTab!.attributes('aria-selected')).toBe('true')
      expect(scheduleTab!.attributes('tabindex')).toBe('0')
      expect(teamTab!.attributes('aria-selected')).toBe('false')
      expect(teamTab!.attributes('tabindex')).toBe('-1')
      expect(document.activeElement).toBe(scheduleTab!.element)
    })

    it('wraps back to the last tab on ArrowLeft from the first tab', async () => {
      const wrapper = mountDialog({}, true)
      const [teamTab, scheduleTab] = tabs(wrapper)

      await teamTab!.trigger('keydown', { key: 'ArrowLeft' })

      expect(scheduleTab!.attributes('aria-selected')).toBe('true')
      expect(scheduleTab!.attributes('tabindex')).toBe('0')
      expect(teamTab!.attributes('aria-selected')).toBe('false')
      expect(teamTab!.attributes('tabindex')).toBe('-1')
      expect(document.activeElement).toBe(scheduleTab!.element)
    })

    it('moves focus and selection back to the first tab on ArrowLeft from the last tab', async () => {
      const wrapper = mountDialog({}, true)
      const [teamTab, scheduleTab] = tabs(wrapper)

      await scheduleTab!.trigger('keydown', { key: 'ArrowRight' })
      await scheduleTab!.trigger('keydown', { key: 'ArrowLeft' })

      expect(teamTab!.attributes('aria-selected')).toBe('true')
      expect(teamTab!.attributes('tabindex')).toBe('0')
      expect(scheduleTab!.attributes('aria-selected')).toBe('false')
      expect(scheduleTab!.attributes('tabindex')).toBe('-1')
      expect(document.activeElement).toBe(teamTab!.element)
    })
  })

  describe('schedule tab', () => {
    it('switches panels when clicked', async () => {
      const wrapper = mountDialog()
      const scheduleTab = tabs(wrapper)[1]!
      await scheduleTab.trigger('click')
      expect(scheduleTab.attributes('aria-selected')).toBe('true')
      const [teamPanel, schedulePanel] = panels(wrapper)
      expect(schedulePanel!.isVisible()).toBe(true)
      expect(teamPanel!.isVisible()).toBe(false)
    })

    it("renders a MatchCard for each of the team's group matches", async () => {
      const wrapper = mountDialog()
      await tabs(wrapper)[1]!.trigger('click')
      expect(wrapper.findComponent(MatchCard).exists()).toBe(true)
      expect(wrapper.findAllComponents(MatchCard)).toHaveLength(3)
    })

    it('passes static to disable the connector icon and datetime toggle', async () => {
      const wrapper = mountDialog()
      await tabs(wrapper)[1]!.trigger('click')
      for (const card of wrapper.findAllComponents(MatchCard)) {
        expect(card.props('static')).toBe(true)
      }
    })
  })
})
