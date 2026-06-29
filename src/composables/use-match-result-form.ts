import { ref, computed } from 'vue'
import type { MatchSlot, Team } from '../types/tournament'
import { useTournamentStore } from '../stores/tournament'
import { useAnnounce } from './use-announce'

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
  }
}
