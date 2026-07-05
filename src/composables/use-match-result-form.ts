import { ref, computed, reactive, toValue, onUnmounted, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import type { MatchSlot, Team } from '../types/tournament'
import { useTournamentStore } from '../stores/tournament'
import { useAnnounce } from './use-announce'
import { syncResults } from '../lib/results-sync'

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
  /** Winner of a penalty shootout, only meaningful while `goals.home === goals.away`
   * in a knockout match — see `Result.shootoutWinner`. Cleared automatically
   * once the scores diverge again so it never lingers as stale state. */
  const shootoutWinner = ref<'home' | 'away' | null>(initial.value?.shootoutWinner ?? null)

  watch(
    () => [goals.home, goals.away] as const,
    ([home, away]) => {
      if (home !== away) shootoutWinner.value = null
    },
  )

  /** Toggle button handler: picking the already-chosen side deselects it. */
  function chooseShootoutWinner(side: 'home' | 'away'): void {
    shootoutWinner.value = shootoutWinner.value === side ? null : side
  }

  const knockoutDraw = computed(
    () => toValue(match).stage !== 'group' && goals.home === goals.away && shootoutWinner.value == null,
  )

  const title = computed(() => `Ergebnis: ${toValue(homeTeam).name} – ${toValue(awayTeam).name}`)

  function save(close: () => void): void {
    if (knockoutDraw.value) return
    store.enterResult({
      matchId: toValue(match).id,
      homeGoals: goals.home,
      awayGoals: goals.away,
      homeYellow: cards.homeYellow,
      homeRed: cards.homeRed,
      awayYellow: cards.awayYellow,
      awayRed: cards.awayRed,
      ...(shootoutWinner.value ? { shootoutWinner: shootoutWinner.value } : {}),
    })
    announce(`Ergebnis gespeichert: ${toValue(homeTeam).name} ${goals.home} : ${goals.away} ${toValue(awayTeam).name}`)
    close()
  }

  function clear(close: () => void): void {
    store.clearResult(toValue(match).id)
    announce('Ergebnis gelöscht')
    close()
  }

  const fetchStatus = ref<FetchLiveStatus>('idle')
  const fetchError = ref<string | null>(null)
  const controller = new AbortController()
  onUnmounted(() => controller.abort())

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
      shootoutWinner.value = result.shootoutWinner ?? null
      fetchStatus.value = 'success'
      announce(
        `Live-Ergebnis übernommen: ${toValue(homeTeam).name} ${result.homeGoals} : ${result.awayGoals} ${toValue(awayTeam).name}`,
      )
    } catch (e) {
      if (controller.signal.aborted) return
      fetchError.value = e instanceof Error ? e.message : 'Abruf fehlgeschlagen.'
      fetchStatus.value = 'error'
    }
  }

  return {
    goals,
    cards,
    shootoutWinner,
    chooseShootoutWinner,
    knockoutDraw,
    title,
    initial,
    save,
    clear,
    fetch: reactive({ status: fetchStatus, error: fetchError, message: fetchMessage, run: fetchLive }),
  }
}
