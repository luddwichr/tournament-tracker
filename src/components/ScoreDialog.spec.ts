// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { allGroupResults, makeResult } from '../test-support/results'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import ConfirmDialog from './ConfirmDialog.vue'
import type { MatchSlot } from '../types/tournament'
import ScoreDialog from './ScoreDialog.vue'
import { makeMatch } from '../test-support/matches'
import { makeTeam } from '../test-support/teams'
import { syncResults } from '../lib/results-sync'
import { useTournamentStore } from '../stores/tournament'

vi.mock('../lib/results-sync', () => ({ syncResults: vi.fn<typeof syncResults>() }))

const homeTeam = makeTeam({ id: 'ger', name: 'Deutschland' })
const awayTeam = makeTeam({ id: 'fra', name: 'Frankreich' })

const groupMatch = makeMatch({
  awayRef: { kind: 'team', teamId: 'fra' },
  group: 'A',
  homeRef: { kind: 'team', teamId: 'ger' },
  id: 'M01',
  stage: 'group',
})

const knockoutMatch = makeMatch({
  awayRef: { kind: 'matchWinner', matchId: 'M74' },
  homeRef: { kind: 'matchWinner', matchId: 'M73' },
  id: 'M90',
  stage: 'sf',
})

function mountDialog(match: MatchSlot = groupMatch) {
  return mount(ScoreDialog, { props: { awayTeam, homeTeam, match } })
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

// Helpers for the penalty-shootout suite.
function scoreInputs(wrapper: ReturnType<typeof mountDialog>) {
  return wrapper.findAllComponents({ name: 'ScoreInput' })
}

function penaltyFor(wrapper: ReturnType<typeof mountDialog>, team: string) {
  return wrapper.findAll('button').find((b) => b.attributes('aria-label') === `Elfmetertor für ${team} hinzufügen`)!
}

// Helpers for the cascade-confirmation suite; see the scenario comment there.
function seedGroupInvalidationScenario() {
  const store = useTournamentStore()
  for (const r of Object.values(allGroupResults(1, 0))) store.enterResult(r)
  store.enterResult(makeResult('M79', 2, 1))
  store.enterResult(makeResult('M92', 1, 0))
  return store
}

async function flipM53ToAwayWin(wrapper: ReturnType<typeof mountDialog>) {
  const decHome = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Tor für Deutschland abziehen')
  await decHome!.trigger('click')
  const incAway = wrapper.findAll('button').find((b) => b.attributes('aria-label') === 'Tor für Frankreich hinzufügen')
  await incAway!.trigger('click')
  await incAway!.trigger('click')
  await incAway!.trigger('click')
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
      awayGoals: 1,
      awayRed: 0,
      awayYellow: 0,
      homeGoals: 2,
      homeRed: 0,
      homeYellow: 0,
      matchId: 'M01',
    })
    const wrapper = mountDialog()
    expect(wrapper.find('.btn--danger').text()).toContain('Löschen')
  })

  it('clicking "Speichern" saves to the store and closes the dialog', async () => {
    const store = useTournamentStore()
    const wrapper = mountDialog()
    await saveButton(wrapper).trigger('click')
    expect(store.results['M01']).toMatchObject({ awayGoals: 0, homeGoals: 0, matchId: 'M01' })
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
      awayGoals: 1,
      awayRed: 0,
      awayYellow: 0,
      homeGoals: 2,
      homeRed: 0,
      homeYellow: 0,
      matchId: 'M01',
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

    it('keeps a persistent role="status" fetch-message element in the DOM before any fetch runs', () => {
      const wrapper = mountDialog()
      const message = wrapper.find('.score-dialog__fetch-message')
      expect(message.exists()).toBe(true)
      expect(message.attributes('role')).toBe('status')
      expect(message.text()).toBe('')
    })

    it('fills the fields from the fetched result without saving to the store', async () => {
      const store = useTournamentStore()
      vi.mocked(syncResults).mockResolvedValue({
        M01: { awayGoals: 1, awayRed: 1, awayYellow: 2, homeGoals: 3, homeRed: 0, homeYellow: 1, matchId: 'M01' },
      })
      const wrapper = mountDialog()

      await wrapper.find('.score-dialog__fetch').trigger('click')
      await flushPromises()

      expect(store.results['M01']).toBeUndefined()
      await saveButton(wrapper).trigger('click')
      expect(store.results['M01']).toMatchObject({
        awayGoals: 1,
        awayRed: 1,
        awayYellow: 2,
        homeGoals: 3,
        homeYellow: 1,
      })
    })

    it('fills the shootout goals from a shootout-decided live result', async () => {
      const store = useTournamentStore()
      vi.mocked(syncResults).mockResolvedValue({
        M90: makeResult('M90', 1, 1, { awayShootoutGoals: 2, homeShootoutGoals: 4 }),
      })
      const wrapper = mountDialog(knockoutMatch)

      await wrapper.find('.score-dialog__fetch').trigger('click')
      await flushPromises()

      expect(scoreInputs(wrapper)).toHaveLength(2)
      await saveButton(wrapper).trigger('click')
      expect(store.results['M90']).toMatchObject({
        awayGoals: 1,
        awayShootoutGoals: 2,
        homeGoals: 1,
        homeShootoutGoals: 4,
      })
    })

    it('shows a message when no live result is found', async () => {
      vi.mocked(syncResults).mockResolvedValue({})
      const wrapper = mountDialog()

      await wrapper.find('.score-dialog__fetch').trigger('click')
      await flushPromises()

      expect(wrapper.find('.score-dialog__fetch-message').text()).toBe('Kein Live-Ergebnis gefunden.')
    })

    it('shows a visible confirmation once a live result is applied', async () => {
      vi.mocked(syncResults).mockResolvedValue({
        M01: { awayGoals: 0, awayRed: 0, awayYellow: 0, homeGoals: 2, homeRed: 0, homeYellow: 0, matchId: 'M01' },
      })
      const wrapper = mountDialog()

      await wrapper.find('.score-dialog__fetch').trigger('click')
      await flushPromises()

      expect(wrapper.find('.score-dialog__fetch-message').text()).toBe(
        'Live-Ergebnis übernommen: Deutschland 2 : 0 Frankreich.',
      )
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
      // scores are equal again; the error is purely derived from
      // (attempted-save && saveError), so it reappears rather than staying
      // latched false.
      expect(wrapper.find('.score-dialog__draw-error').exists()).toBe(true)
    })
  })

  describe('penalty shootout', () => {
    it('shows no shootout inputs for a group match, even at a level score', () => {
      expect(scoreInputs(mountDialog(groupMatch))).toHaveLength(1)
    })

    it('shows the shootout inputs exactly while a knockout score is level', async () => {
      const wrapper = mountDialog(knockoutMatch) // opens at 0:0 — level
      expect(scoreInputs(wrapper)).toHaveLength(2)
      const incGoal = wrapper
        .findAll('button')
        .find((b) => b.attributes('aria-label') === 'Tor für Deutschland hinzufügen')
      await incGoal!.trigger('click')
      expect(scoreInputs(wrapper)).toHaveLength(1)
    })

    it('saves a level score with decisive shootout goals', async () => {
      const store = useTournamentStore()
      const wrapper = mountDialog(knockoutMatch)
      await penaltyFor(wrapper, 'Deutschland').trigger('click')
      await saveButton(wrapper).trigger('click')
      expect(store.results['M90']).toMatchObject({
        awayGoals: 0,
        awayShootoutGoals: 0,
        homeGoals: 0,
        homeShootoutGoals: 1,
      })
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('blocks saving a level shootout with a draw error', async () => {
      const store = useTournamentStore()
      const wrapper = mountDialog(knockoutMatch)
      await saveButton(wrapper).trigger('click')
      expect(store.results['M90']).toBeUndefined()
      expect(wrapper.find('.score-dialog__draw-error').text()).toBe(
        'Unentschieden geht nicht! Wer hat das Elfmeterschießen gewonnen?',
      )
    })

    it('round-trips an existing shootout result: pre-filled and unchanged on save', async () => {
      const store = useTournamentStore()
      const existing = makeResult('M90', 1, 1, { awayShootoutGoals: 2, homeShootoutGoals: 4 })
      store.enterResult(existing)
      const wrapper = mountDialog(knockoutMatch)
      expect(scoreInputs(wrapper)).toHaveLength(2)
      await saveButton(wrapper).trigger('click')
      expect(store.results['M90']).toEqual(existing)
    })

    it('drops the shootout fields once the score is edited to be decisive', async () => {
      const store = useTournamentStore()
      store.enterResult(makeResult('M90', 1, 1, { awayShootoutGoals: 2, homeShootoutGoals: 4 }))
      const wrapper = mountDialog(knockoutMatch)
      const incGoal = wrapper
        .findAll('button')
        .find((b) => b.attributes('aria-label') === 'Tor für Deutschland hinzufügen')
      await incGoal!.trigger('click') // 2:1 — decisive without a shootout
      await saveButton(wrapper).trigger('click')
      expect(store.results['M90']).toMatchObject({ awayGoals: 1, homeGoals: 2 })
      expect(store.results['M90']!.homeShootoutGoals).toBeUndefined()
      expect(store.results['M90']!.awayShootoutGoals).toBeUndefined()
    })
  })

  // -------------------------------------------------------------------------
  // Cascade confirmation (REVIEW.md §9.1) — editing/clearing a result must not
  // silently re-attribute a downstream knockout result to a different pairing.
  // -------------------------------------------------------------------------
  describe('cascade confirmation', () => {
    // M53 (group A) real fixture data: with every group match a 1:0 home win,
    // Tschechien beats Mexiko head-to-head and takes Group A's rank 1. Group
    // A's rank-1 R32 slot (M79) and the R16 slot fed by M79's winner (M92)
    // are seeded with stored results, so flipping M53 invalidates both — see
    // invalidation.spec.ts for the standings math behind this scenario.
    const m53Match = makeMatch({
      awayRef: { kind: 'team', teamId: 'fra' },
      group: 'A',
      homeRef: { kind: 'team', teamId: 'ger' },
      id: 'M53',
      stage: 'group',
    })

    it('shows a ConfirmDialog instead of writing when saving would invalidate downstream results', async () => {
      const store = seedGroupInvalidationScenario()
      const wrapper = mountDialog(m53Match)
      await flipM53ToAwayWin(wrapper)

      await saveButton(wrapper).trigger('click')

      expect(wrapper.findComponent(ConfirmDialog).exists()).toBe(true)
      expect(store.results['M53']).toEqual(makeResult('M53', 1, 0))
      expect(store.results['M79']).toBeDefined()
      expect(store.results['M92']).toBeDefined()
      expect(wrapper.emitted('close')).toBeUndefined()
    })

    it('cancelling the ConfirmDialog leaves the store unchanged and keeps ScoreDialog open', async () => {
      const store = seedGroupInvalidationScenario()
      const wrapper = mountDialog(m53Match)
      await flipM53ToAwayWin(wrapper)
      await saveButton(wrapper).trigger('click')

      await wrapper
        .findComponent(ConfirmDialog)
        .findAll('button')
        .find((b) => b.text() === 'Abbrechen')!
        .trigger('click')

      expect(wrapper.findComponent(ConfirmDialog).exists()).toBe(false)
      expect(store.results['M53']).toEqual(makeResult('M53', 1, 0))
      expect(store.results['M79']).toBeDefined()
      expect(store.results['M92']).toBeDefined()
      expect(wrapper.emitted('close')).toBeUndefined()
    })

    it('confirming the ConfirmDialog writes the store, drops the invalidated results, and closes', async () => {
      const store = seedGroupInvalidationScenario()
      const wrapper = mountDialog(m53Match)
      await flipM53ToAwayWin(wrapper)
      await saveButton(wrapper).trigger('click')

      await wrapper
        .findComponent(ConfirmDialog)
        .findAll('button')
        .find((b) => b.text() === 'Trotzdem speichern')!
        .trigger('click')

      expect(wrapper.findComponent(ConfirmDialog).exists()).toBe(false)
      expect(store.results['M53']).toEqual(makeResult('M53', 0, 3))
      expect(store.results['M79']).toBeUndefined()
      expect(store.results['M92']).toBeUndefined()
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('a harmless save shows no ConfirmDialog and behaves as before', async () => {
      const store = seedGroupInvalidationScenario()
      const wrapper = mountDialog(m53Match)
      // M53: 1:0 → 2:0 — Tschechien still wins, group order is unaffected.
      const incHome = wrapper
        .findAll('button')
        .find((b) => b.attributes('aria-label') === 'Tor für Deutschland hinzufügen')
      await incHome!.trigger('click')

      await saveButton(wrapper).trigger('click')

      expect(wrapper.findComponent(ConfirmDialog).exists()).toBe(false)
      expect(store.results['M53']).toEqual(makeResult('M53', 2, 0))
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('shows the same confirm flow with a "Trotzdem löschen" label when deleting a group match with dependent knockout results', async () => {
      const store = seedGroupInvalidationScenario()
      const wrapper = mountDialog(m53Match)

      await deleteButton(wrapper)!.trigger('click')

      const confirmDialog = wrapper.findComponent(ConfirmDialog)
      expect(confirmDialog.exists()).toBe(true)
      expect(confirmDialog.find('.btn--danger').text()).toBe('Trotzdem löschen')
      expect(store.results['M53']).toBeDefined()

      await confirmDialog
        .findAll('button')
        .find((b) => b.text() === 'Trotzdem löschen')!
        .trigger('click')

      expect(store.results['M53']).toBeUndefined()
      expect(store.results['M79']).toBeUndefined()
      expect(store.results['M92']).toBeUndefined()
      expect(wrapper.emitted('close')).toHaveLength(1)
    })
  })
})
