// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ScoreDialog from './ScoreDialog.vue'
import { useTournamentStore } from '../stores/tournament'
import { makeTeam } from '../test-support/teams'
import { makeMatch } from '../test-support/matches'
import { syncResults } from '../lib/results-sync'

vi.mock('../lib/results-sync', () => ({ syncResults: vi.fn() }))

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

function saveButton(wrapper: ReturnType<typeof mountDialog>) {
  return wrapper.findAll('button').find((b) => b.text().includes('Speichern'))!
}

function cancelButton(wrapper: ReturnType<typeof mountDialog>) {
  return wrapper.findAll('button').find((b) => b.text().includes('Abbrechen'))!
}

function deleteButton(wrapper: ReturnType<typeof mountDialog>) {
  return wrapper.findAll('button').find((b) => b.text().includes('Löschen'))
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
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
    expect(deleteButton(wrapper)).toBeUndefined()
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
    await saveButton(wrapper).trigger('click')
    expect(store.results['M01']).toMatchObject({ matchId: 'M01', homeGoals: 0, awayGoals: 0 })
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('clicking "Abbrechen" closes without saving', async () => {
    const store = useTournamentStore()
    const wrapper = mountDialog()
    await cancelButton(wrapper).trigger('click')
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
    await deleteButton(wrapper)!.trigger('click')
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
    await saveButton(wrapper).trigger('click')
    expect(store.results['M01']).toMatchObject({ awayGoals: 1 })
  })

  describe('discipline inputs', () => {
    it('home yellow card increments are saved to the store', async () => {
      const store = useTournamentStore()
      const wrapper = mountDialog()
      const btn = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Gelbe Karte Heim hinzufügen')
      await btn!.trigger('click')
      await saveButton(wrapper).trigger('click')
      expect(store.results['M01']).toMatchObject({ homeYellow: 1 })
    })

    it('home red card increments are saved to the store', async () => {
      const store = useTournamentStore()
      const wrapper = mountDialog()
      const btn = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Rote Karte Heim hinzufügen')
      await btn!.trigger('click')
      await saveButton(wrapper).trigger('click')
      expect(store.results['M01']).toMatchObject({ homeRed: 1 })
    })

    it('away yellow card increments are saved to the store', async () => {
      const store = useTournamentStore()
      const wrapper = mountDialog()
      const btn = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Gelbe Karte Gast hinzufügen')
      await btn!.trigger('click')
      await saveButton(wrapper).trigger('click')
      expect(store.results['M01']).toMatchObject({ awayYellow: 1 })
    })

    it('away red card increments are saved to the store', async () => {
      const store = useTournamentStore()
      const wrapper = mountDialog()
      const btn = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Rote Karte Gast hinzufügen')
      await btn!.trigger('click')
      await saveButton(wrapper).trigger('click')
      expect(store.results['M01']).toMatchObject({ awayRed: 1 })
    })
  })

  describe('live result fetch', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-07-02T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('hides the fetch button before kickoff', () => {
      const future = makeMatch({ id: 'M99', kickoff: '2026-07-03T18:00:00+02:00' })
      const wrapper = mountDialog(future)
      expect(wrapper.find('.score-dialog__fetch').exists()).toBe(false)
    })

    it('shows the fetch button once kickoff has passed', () => {
      const past = makeMatch({ id: 'M98', kickoff: '2026-07-01T18:00:00+02:00' })
      const wrapper = mountDialog(past)
      expect(wrapper.find('.score-dialog__fetch').exists()).toBe(true)
    })

    it('fills the fields from the fetched result without saving to the store', async () => {
      const store = useTournamentStore()
      vi.mocked(syncResults).mockResolvedValue({
        M01: { matchId: 'M01', homeGoals: 3, awayGoals: 1, homeYellow: 1, homeRed: 0, awayYellow: 2, awayRed: 1 },
      })
      const wrapper = mountDialog()

      await wrapper.find('.score-dialog__fetch').trigger('click')
      await flushPromises()

      expect(store.results['M01']).toBeUndefined()
      await saveButton(wrapper).trigger('click')
      expect(store.results['M01']).toMatchObject({
        homeGoals: 3,
        awayGoals: 1,
        homeYellow: 1,
        awayYellow: 2,
        awayRed: 1,
      })
    })

    it('shows a message when no live result is found', async () => {
      vi.mocked(syncResults).mockResolvedValue({})
      const wrapper = mountDialog()

      await wrapper.find('.score-dialog__fetch').trigger('click')
      await flushPromises()

      expect(wrapper.find('.score-dialog__fetch-message').text()).toBe('Kein Live-Ergebnis gefunden.')
    })

    it('shows the error message when the fetch fails', async () => {
      vi.mocked(syncResults).mockRejectedValue(new Error('Netzfehler'))
      const wrapper = mountDialog()

      await wrapper.find('.score-dialog__fetch').trigger('click')
      await flushPromises()

      expect(wrapper.find('.score-dialog__fetch-message--error').text()).toBe('Netzfehler')
    })
  })

  describe('knockout draw validation', () => {
    it('shows no error on mount for a knockout draw', () => {
      const wrapper = mountDialog(knockoutMatch)
      expect(wrapper.find('.score-dialog__draw-error').exists()).toBe(false)
    })

    it('shows error after clicking "Speichern" with a knockout draw', async () => {
      const wrapper = mountDialog(knockoutMatch)
      await saveButton(wrapper).trigger('click')
      expect(wrapper.find('.score-dialog__draw-error').exists()).toBe(true)
    })

    it('does not save when "Speichern" is clicked with a knockout draw', async () => {
      const store = useTournamentStore()
      const wrapper = mountDialog(knockoutMatch)
      await saveButton(wrapper).trigger('click')
      expect(store.results['M90']).toBeUndefined()
      expect(wrapper.emitted('close')).toBeUndefined()
    })

    it('error clears automatically once scores differ', async () => {
      const wrapper = mountDialog(knockoutMatch)
      await saveButton(wrapper).trigger('click')
      expect(wrapper.find('.score-dialog__draw-error').exists()).toBe(true)
      const inc = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Tor für Deutschland hinzufügen')
      await inc!.trigger('click')
      expect(wrapper.find('.score-dialog__draw-error').exists()).toBe(false)
    })

    it('shows no error for a group-stage draw', async () => {
      const wrapper = mountDialog(groupMatch)
      await saveButton(wrapper).trigger('click')
      expect(wrapper.find('.score-dialog__draw-error').exists()).toBe(false)
    })

    it('error reappears when scores return to a draw after differing', async () => {
      const wrapper = mountDialog(knockoutMatch)
      await saveButton(wrapper).trigger('click')
      expect(wrapper.find('.score-dialog__draw-error').exists()).toBe(true)
      const inc = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Tor für Deutschland hinzufügen')
      await inc!.trigger('click')
      expect(wrapper.find('.score-dialog__draw-error').exists()).toBe(false)
      const dec = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Tor für Deutschland abziehen')
      await dec!.trigger('click')
      // scores are equal again; showDrawError is now purely derived from
      // (attempted-save && knockoutDraw), so it reappears rather than staying
      // latched false.
      expect(wrapper.find('.score-dialog__draw-error').exists()).toBe(true)
    })
  })
})
