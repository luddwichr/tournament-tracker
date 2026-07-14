import { ref, computed, reactive, toValue, onUnmounted } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import type { MatchSlot, Result, Team } from '../types/tournament'
import { useTournamentStore } from '../stores/tournament'
import { useAnnounce } from './use-announce'
import { syncResults } from '../lib/results-sync'
import { invalidatedDownstream, invalidatedMatchLabel } from '../lib/invalidation'

/** A save/clear whose write is on hold pending user confirmation (REVIEW.md §9.1) —
 * the write would silently re-attribute the results of these later knockout matches. */
interface PendingAction {
  kind: 'save' | 'clear'
  invalidatedIds: readonly string[]
}

export type FetchLiveStatus = 'idle' | 'loading' | 'success' | 'not-found' | 'error'

export function useMatchResultForm(
  match: MaybeRefOrGetter<MatchSlot>,
  homeTeam: MaybeRefOrGetter<Team>,
  awayTeam: MaybeRefOrGetter<Team>,
) {
  const store = useTournamentStore()
  const announce = useAnnounce()

  const initial = computed(() => store.results[toValue(match).id] ?? null)

  const goals = reactive({
    home: initial.value?.homeGoals ?? 0,
    away: initial.value?.awayGoals ?? 0,
  })
  const cards = reactive({
    homeYellow: initial.value?.homeYellow ?? 0,
    homeRed: initial.value?.homeRed ?? 0,
    awayYellow: initial.value?.awayYellow ?? 0,
    awayRed: initial.value?.awayRed ?? 0,
  })
  const knockoutDraw = computed(() => toValue(match).stage !== 'group' && goals.home === goals.away)

  const title = computed(() => `Ergebnis: ${toValue(homeTeam).name} – ${toValue(awayTeam).name}`)

  function buildResult(): Result {
    return {
      matchId: toValue(match).id,
      homeGoals: goals.home,
      awayGoals: goals.away,
      homeYellow: cards.homeYellow,
      homeRed: cards.homeRed,
      awayYellow: cards.awayYellow,
      awayRed: cards.awayRed,
    }
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

  function commitSave(close: () => void): void {
    store.enterResult(buildResult())
    announce(`Ergebnis gespeichert: ${toValue(homeTeam).name} ${goals.home} : ${goals.away} ${toValue(awayTeam).name}`)
    close()
  }

  function commitClear(close: () => void): void {
    store.clearResult(toValue(match).id)
    announce('Ergebnis gelöscht')
    close()
  }

  function save(close: () => void): void {
    if (knockoutDraw.value) return
    // Computed before the store write (the store recomputes the same thing
    // internally) — state hasn't changed in between, so the results are
    // identical either way.
    const invalidated = invalidatedDownstream(store.results, toValue(match).id, buildResult())
    if (invalidated.length > 0) {
      pendingAction.value = { kind: 'save', invalidatedIds: invalidated }
      return
    }
    commitSave(close)
  }

  function clear(close: () => void): void {
    const invalidated = invalidatedDownstream(store.results, toValue(match).id, null)
    if (invalidated.length > 0) {
      pendingAction.value = { kind: 'clear', invalidatedIds: invalidated }
      return
    }
    commitClear(close)
  }

  /** Runs the held-back save/clear after the user confirms discarding the downstream results. */
  function confirmPending(close: () => void): void {
    const action = pendingAction.value
    pendingAction.value = null
    if (!action) return
    if (action.kind === 'save') commitSave(close)
    else commitClear(close)
  }

  function cancelPending(): void {
    pendingAction.value = null
  }

  const fetchStatus = ref<FetchLiveStatus>('idle')
  const fetchError = ref<string | null>(null)
  const controller = new AbortController()
  onUnmounted(() => {
    controller.abort()
  })

  /** Visible confirmation for `success`/`not-found`, so the live-fetch outcome
   * is perceivable even while `announce()`'s global `role="status"` region is
   * inert (it lives outside the modal `<dialog>`, which `showModal()` makes
   * `inert`). Empty for `idle`/`loading`/`error` — `error` has its own
   * `role="alert"` element instead. */
  const fetchMessage = computed(() => {
    if (fetchStatus.value === 'success') {
      return `Live-Ergebnis übernommen: ${toValue(homeTeam).name} ${goals.home} : ${goals.away} ${toValue(awayTeam).name}.`
    }
    if (fetchStatus.value === 'not-found') {
      return 'Kein Live-Ergebnis gefunden.'
    }
    return ''
  })

  /** Fetches the whole results feed and plucks this match's result, filling
   * the fields for review — nothing is written to the store here, so there's
   * nothing to warn about overwriting. The fetch is aborted on unmount so a
   * request still in flight can't later write to a closed dialog. */
  async function fetchLive(): Promise<void> {
    fetchStatus.value = 'loading'
    fetchError.value = null
    try {
      const results = await syncResults(undefined, { signal: controller.signal })
      const result = results[toValue(match).id]
      if (!result) {
        fetchStatus.value = 'not-found'
        return
      }
      goals.home = result.homeGoals
      goals.away = result.awayGoals
      cards.homeYellow = result.homeYellow
      cards.homeRed = result.homeRed
      cards.awayYellow = result.awayYellow
      cards.awayRed = result.awayRed
      fetchStatus.value = 'success'
    } catch (e) {
      if (controller.signal.aborted) return
      fetchError.value = e instanceof Error ? e.message : 'Abruf fehlgeschlagen.'
      fetchStatus.value = 'error'
    }
  }

  return {
    goals,
    cards,
    knockoutDraw,
    title,
    initial,
    save,
    clear,
    pendingAction,
    pendingMessage,
    confirmPending,
    cancelPending,
    fetch: reactive({ status: fetchStatus, error: fetchError, message: fetchMessage, run: fetchLive }),
  }
}
