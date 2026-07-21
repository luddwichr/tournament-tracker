import type { MatchSlot, Result, Team } from '../types/tournament'
import { computed, reactive, ref, toValue } from 'vue'
import { invalidatedDownstream, invalidatedMatchLabel } from '../lib/invalidation'
import type { MaybeRefOrGetter } from 'vue'
import { useAnnounce } from './use-announce'
import { useLiveResultFetch } from './use-live-result-fetch'
import { useTournamentStore } from '../stores/tournament'

/**
 * A save or clear whose write is on hold pending user confirmation.
 * The write would silently re-attribute the results of these later knockout matches.
 */
interface PendingAction {
  kind: 'save' | 'clear'
  invalidatedIds: readonly string[]
}

export function useMatchResultForm(
  match: MaybeRefOrGetter<MatchSlot>,
  homeTeam: MaybeRefOrGetter<Team>,
  awayTeam: MaybeRefOrGetter<Team>,
) {
  const store = useTournamentStore()
  const announce = useAnnounce()

  const initial = computed(() => store.results[toValue(match).id] ?? null)

  const goals = reactive({
    away: initial.value?.awayGoals ?? 0,
    home: initial.value?.homeGoals ?? 0,
  })
  const cards = reactive({
    awayRed: initial.value?.awayRed ?? 0,
    awayYellow: initial.value?.awayYellow ?? 0,
    homeRed: initial.value?.homeRed ?? 0,
    homeYellow: initial.value?.homeYellow ?? 0,
  })
  const shootout = reactive({
    away: initial.value?.awayShootoutGoals ?? 0,
    home: initial.value?.homeShootoutGoals ?? 0,
  })

  /**
   * A level knockout score goes to a shootout.
   * The dialog shows the shootout steppers exactly then, and only then does `buildResult` keep their values.
   */
  const shootoutRequired = computed(() => toValue(match).stage !== 'group' && goals.home === goals.away)

  /**
   * German error message blocking the save, or null when the form is saveable
   * (see the `Result` shootout invariants in `types/tournament.ts`).
   */
  const saveError = computed((): string | null => {
    if (shootoutRequired.value && shootout.home === shootout.away) {
      return 'Unentschieden geht nicht! Wer hat das Elfmeterschießen gewonnen?'
    }
    return null
  })

  const title = computed(() => `Ergebnis: ${toValue(homeTeam).name} – ${toValue(awayTeam).name}`)

  function buildResult(): Result {
    return {
      awayGoals: goals.away,
      awayRed: cards.awayRed,
      awayYellow: cards.awayYellow,
      homeGoals: goals.home,
      homeRed: cards.homeRed,
      homeYellow: cards.homeYellow,
      matchId: toValue(match).id,
      ...(shootoutRequired.value ? { awayShootoutGoals: shootout.away, homeShootoutGoals: shootout.home } : {}),
    }
  }

  /** Spoken score for announcements, e.g. "Schweiz 1 : 1 Kolumbien, 4 : 3 im Elfmeterschießen". */
  function scoreText(): string {
    const base = `${toValue(homeTeam).name} ${goals.home} : ${goals.away} ${toValue(awayTeam).name}`
    return shootoutRequired.value ? `${base}, ${shootout.home} : ${shootout.away} im Elfmeterschießen` : base
  }

  const pendingAction = ref<PendingAction | null>(null)

  /** German multi-line message for the confirm dialog, '' while nothing is pending. */
  const pendingMessage = computed(() => {
    const action = pendingAction.value
    if (!action) return ''
    const n = action.invalidatedIds.length
    const intro =
      n === 1
        ? 'Diese Änderung ändert, welche Teams in einem späteren Spiel aufeinandertreffen. Dieses Ergebnis wird gelöscht:'
        : `Diese Änderung ändert, welche Teams in ${n} späteren Spielen aufeinandertreffen. Diese Ergebnisse werden gelöscht:`
    const lines = action.invalidatedIds.map((id) => invalidatedMatchLabel(id, store.results))
    return [intro, ...lines].join('\n')
  })

  function commitSave(): void {
    store.enterResult(buildResult())
    announce(`Ergebnis gespeichert: ${scoreText()}`)
  }

  function commitClear(): void {
    store.clearResult(toValue(match).id)
    announce('Ergebnis gelöscht')
  }

  /**
   * Writes the result, or holds it behind a confirm when it would invalidate
   * later matches. Returns true once the write happened so the caller can close
   * the dialog; false while the form is blocked or a confirmation is pending.
   */
  function save(): boolean {
    if (saveError.value) return false
    // Computed before the store write, which recomputes the same thing internally.
    // State hasn't changed in between, so the results are identical either way.
    const invalidated = invalidatedDownstream(store.results, toValue(match).id, buildResult())
    if (invalidated.length > 0) {
      pendingAction.value = { invalidatedIds: invalidated, kind: 'save' }
      return false
    }
    commitSave()
    return true
  }

  /**
   * Clears the result, or holds it behind a confirm when it would invalidate
   * later matches. Returns true once the clear happened (see `save`).
   */
  function clear(): boolean {
    const invalidated = invalidatedDownstream(store.results, toValue(match).id, null)
    if (invalidated.length > 0) {
      pendingAction.value = { invalidatedIds: invalidated, kind: 'clear' }
      return false
    }
    commitClear()
    return true
  }

  /**
   * Runs the held-back save/clear after the user confirms discarding the
   * downstream results. Returns true when it committed so the caller can close.
   */
  function confirmPending(): boolean {
    const action = pendingAction.value
    pendingAction.value = null
    if (!action) return false
    if (action.kind === 'save') commitSave()
    else commitClear()
    return true
  }

  function cancelPending(): void {
    pendingAction.value = null
  }

  /** Fills the form fields from a fetched result, leaving the save to the user. */
  function applyFetched(result: Result): void {
    goals.home = result.homeGoals
    goals.away = result.awayGoals
    cards.homeYellow = result.homeYellow
    cards.homeRed = result.homeRed
    cards.awayYellow = result.awayYellow
    cards.awayRed = result.awayRed
    shootout.home = result.homeShootoutGoals ?? 0
    shootout.away = result.awayShootoutGoals ?? 0
  }

  const liveFetch = useLiveResultFetch(() => toValue(match).id, applyFetched, scoreText)

  return {
    cancelPending,
    cards,
    clear,
    confirmPending,
    fetch: reactive(liveFetch),
    goals,
    initial,
    pendingAction,
    pendingMessage,
    save,
    saveError,
    shootout,
    shootoutRequired,
    title,
  }
}
