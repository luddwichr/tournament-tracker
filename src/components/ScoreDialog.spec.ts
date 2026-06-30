import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ScoreDialog from './ScoreDialog.vue'
import { useTournamentStore } from '../stores/tournament'
import { makeTeam } from '../test-support/teams'
import { makeMatch } from '../test-support/matches'

const homeTeam = makeTeam({ id: 'ger', name: 'Deutschland' })
const awayTeam = makeTeam({ id: 'fra', name: 'Frankreich' })

const groupMatch = makeMatch({
  id: 'M01',
  stage: 'group',
  group: 'A',
  homeRef: { kind: 'team', teamId: 'ger' },
  awayRef: { kind: 'team', teamId: 'fra' },
})

const knockoutMatch = makeMatch({
  id: 'M90',
  stage: 'sf',
  homeRef: { kind: 'matchWinner', matchId: 'M73' },
  awayRef: { kind: 'matchWinner', matchId: 'M74' },
})

function mountDialog(match = groupMatch) {
  return mount(ScoreDialog, { props: { match, homeTeam, awayTeam } })
}

beforeEach(() => {
  setActivePinia(createPinia())
  HTMLDialogElement.prototype.showModal = vi.fn()
  HTMLDialogElement.prototype.close = vi.fn().mockImplementation(function (this: HTMLDialogElement) {
    this.dispatchEvent(new Event('close'))
  })
})

describe('ScoreDialog', () => {
  it('sets the dialog title to "Ergebnis: HomeTeam – AwayTeam"', () => {
    const wrapper = mountDialog()
    expect(wrapper.find('.base-dialog__title').text()).toBe('Ergebnis: Deutschland – Frankreich')
  })

  it('renders a ScoreInput and DisciplineInput', () => {
    const wrapper = mountDialog()
    expect(wrapper.findComponent({ name: 'ScoreInput' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'DisciplineInput' }).exists()).toBe(true)
  })

  it('hides "Löschen" when there is no existing result', () => {
    const wrapper = mountDialog()
    expect(wrapper.find('.btn--danger').exists()).toBe(false)
  })

  it('shows "Löschen" when an existing result is present', () => {
    const store = useTournamentStore()
    store.enterResult({
      matchId: 'M01',
      homeGoals: 2,
      awayGoals: 1,
      homeYellow: 0,
      homeRed: 0,
      awayYellow: 0,
      awayRed: 0,
    })
    const wrapper = mountDialog()
    expect(wrapper.find('.btn--danger').text()).toContain('Löschen')
  })

  it('clicking "Speichern" saves to the store and closes the dialog', async () => {
    const store = useTournamentStore()
    const wrapper = mountDialog()
    await wrapper.find('.btn--primary').trigger('click')
    expect(store.results['M01']).toMatchObject({ matchId: 'M01', homeGoals: 0, awayGoals: 0 })
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('clicking "Abbrechen" closes without saving', async () => {
    const store = useTournamentStore()
    const wrapper = mountDialog()
    await wrapper.find('.btn--secondary').trigger('click')
    expect(store.results['M01']).toBeUndefined()
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('clicking "Löschen" removes the result from the store and closes', async () => {
    const store = useTournamentStore()
    store.enterResult({
      matchId: 'M01',
      homeGoals: 2,
      awayGoals: 1,
      homeYellow: 0,
      homeRed: 0,
      awayYellow: 0,
      awayRed: 0,
    })
    const wrapper = mountDialog()
    await wrapper.find('.btn--danger').trigger('click')
    expect(store.results['M01']).toBeUndefined()
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits "close" when the dialog fires its native close event', async () => {
    const wrapper = mountDialog()
    await wrapper.find('dialog').trigger('close')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('away goal increments are reflected when saved', async () => {
    const store = useTournamentStore()
    const wrapper = mountDialog()
    const btn = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Tor für Frankreich hinzufügen')
    await btn!.trigger('click')
    await wrapper.find('.btn--primary').trigger('click')
    expect(store.results['M01']).toMatchObject({ awayGoals: 1 })
  })

  describe('discipline inputs', () => {
    it('home yellow card increments are saved to the store', async () => {
      const store = useTournamentStore()
      const wrapper = mountDialog()
      const btn = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Gelbe Karte Heim hinzufügen')
      await btn!.trigger('click')
      await wrapper.find('.btn--primary').trigger('click')
      expect(store.results['M01']).toMatchObject({ homeYellow: 1 })
    })

    it('home red card increments are saved to the store', async () => {
      const store = useTournamentStore()
      const wrapper = mountDialog()
      const btn = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Rote Karte Heim hinzufügen')
      await btn!.trigger('click')
      await wrapper.find('.btn--primary').trigger('click')
      expect(store.results['M01']).toMatchObject({ homeRed: 1 })
    })

    it('away yellow card increments are saved to the store', async () => {
      const store = useTournamentStore()
      const wrapper = mountDialog()
      const btn = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Gelbe Karte Gast hinzufügen')
      await btn!.trigger('click')
      await wrapper.find('.btn--primary').trigger('click')
      expect(store.results['M01']).toMatchObject({ awayYellow: 1 })
    })

    it('away red card increments are saved to the store', async () => {
      const store = useTournamentStore()
      const wrapper = mountDialog()
      const btn = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Rote Karte Gast hinzufügen')
      await btn!.trigger('click')
      await wrapper.find('.btn--primary').trigger('click')
      expect(store.results['M01']).toMatchObject({ awayRed: 1 })
    })
  })

  describe('knockout draw validation', () => {
    it('shows no error on mount for a knockout draw', () => {
      const wrapper = mountDialog(knockoutMatch)
      expect(wrapper.find('.score-dialog__draw-error').exists()).toBe(false)
    })

    it('shows error after clicking "Speichern" with a knockout draw', async () => {
      const wrapper = mountDialog(knockoutMatch)
      await wrapper.find('.btn--primary').trigger('click')
      expect(wrapper.find('.score-dialog__draw-error').exists()).toBe(true)
    })

    it('does not save when "Speichern" is clicked with a knockout draw', async () => {
      const store = useTournamentStore()
      const wrapper = mountDialog(knockoutMatch)
      await wrapper.find('.btn--primary').trigger('click')
      expect(store.results['M90']).toBeUndefined()
      expect(wrapper.emitted('close')).toBeUndefined()
    })

    it('error clears automatically once scores differ', async () => {
      const wrapper = mountDialog(knockoutMatch)
      await wrapper.find('.btn--primary').trigger('click')
      expect(wrapper.find('.score-dialog__draw-error').exists()).toBe(true)
      const inc = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Tor für Deutschland hinzufügen')
      await inc!.trigger('click')
      expect(wrapper.find('.score-dialog__draw-error').exists()).toBe(false)
    })

    it('shows no error for a group-stage draw', async () => {
      const wrapper = mountDialog(groupMatch)
      await wrapper.find('.btn--primary').trigger('click')
      expect(wrapper.find('.score-dialog__draw-error').exists()).toBe(false)
    })

    it('error stays cleared when scores return to a draw after differing', async () => {
      const wrapper = mountDialog(knockoutMatch)
      await wrapper.find('.btn--primary').trigger('click')
      expect(wrapper.find('.score-dialog__draw-error').exists()).toBe(true)
      const inc = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Tor für Deutschland hinzufügen')
      await inc!.trigger('click')
      expect(wrapper.find('.score-dialog__draw-error').exists()).toBe(false)
      const dec = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Tor für Deutschland abziehen')
      await dec!.trigger('click')
      // scores are equal again; showDrawError stays false (watch no-op when isDraw=true)
      expect(wrapper.find('.score-dialog__draw-error').exists()).toBe(false)
    })
  })
})
