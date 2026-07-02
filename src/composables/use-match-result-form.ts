import { ref, computed } from 'vue'
import type { MatchSlot, Team } from '../types/tournament'
import { useTournamentStore } from '../stores/tournament'
import { useAnnounce } from './use-announce'
import { syncResults } from '../lib/results-sync'

export type FetchLiveStatus = 'idle' | 'loading' | 'success' | 'not-found' | 'error'

export function useMatchResultForm(match: MatchSlot, homeTeam: Team, awayTeam: Team) {
  const store = useTournamentStore()
  const announce = useAnnounce()

  const initial = computed(() => store.results[match.id] ?? null)

  const homeGoals = ref(initial.value?.homeGoals ?? 0)
  const awayGoals = ref(initial.value?.awayGoals ?? 0)
  const homeYellow = ref(initial.value?.homeYellow ?? 0)
  const homeRed = ref(initial.value?.homeRed ?? 0)
  const awayYellow = ref(initial.value?.awayYellow ?? 0)
  const awayRed = ref(initial.value?.awayRed ?? 0)
  const knockoutDraw = computed(() => match.stage !== 'group' && homeGoals.value === awayGoals.value)

  const title = `Ergebnis: ${homeTeam.name} – ${awayTeam.name}`

  function save(close: () => void): void {
    if (knockoutDraw.value) return
    store.enterResult({
      matchId: match.id,
      homeGoals: homeGoals.value,
      awayGoals: awayGoals.value,
      homeYellow: homeYellow.value,
      homeRed: homeRed.value,
      awayYellow: awayYellow.value,
      awayRed: awayRed.value,
    })
    announce(`Ergebnis gespeichert: ${homeTeam.name} ${homeGoals.value} : ${awayGoals.value} ${awayTeam.name}`)
    close()
  }

  function clear(close: () => void): void {
    store.clearResult(match.id)
    announce('Ergebnis gelöscht')
    close()
  }

  const fetchStatus = ref<FetchLiveStatus>('idle')
  const fetchError = ref<string | null>(null)

  /** Looks up the live result for just this match and fills the fields with
   * it, leaving the user to review and press "Speichern" — nothing is
   * written to the store here, so there's nothing to warn about overwriting. */
  async function fetchLive(): Promise<void> {
    fetchStatus.value = 'loading'
    fetchError.value = null
    try {
      const results = await syncResults()
      const result = results[match.id]
      if (!result) {
        fetchStatus.value = 'not-found'
        return
      }
      homeGoals.value = result.homeGoals
      awayGoals.value = result.awayGoals
      homeYellow.value = result.homeYellow
      homeRed.value = result.homeRed
      awayYellow.value = result.awayYellow
      awayRed.value = result.awayRed
      fetchStatus.value = 'success'
      announce(`Live-Ergebnis übernommen: ${homeTeam.name} ${result.homeGoals} : ${result.awayGoals} ${awayTeam.name}`)
    } catch (e) {
      fetchError.value = e instanceof Error ? e.message : 'Abruf fehlgeschlagen.'
      fetchStatus.value = 'error'
    }
  }

  return {
    homeGoals,
    awayGoals,
    homeYellow,
    homeRed,
    awayYellow,
    awayRed,
    knockoutDraw,
    title,
    initial,
    save,
    clear,
    fetchStatus,
    fetchError,
    fetchLive,
  }
}
