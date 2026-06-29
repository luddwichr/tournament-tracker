import { ref, computed, watch } from 'vue'
import type { MatchSlot, Team } from '../types/tournament'
import { useTournamentStore } from '../stores/tournament'
import { useAnnounce } from './use-announce'

export function useMatchResultForm(match: MatchSlot, homeTeam: Team | null, awayTeam: Team | null) {
  const store = useTournamentStore()
  const announce = useAnnounce()

  const initial = computed(() => store.results[match.id] ?? null)

  const homeGoals = ref(initial.value?.homeGoals ?? 0)
  const awayGoals = ref(initial.value?.awayGoals ?? 0)
  const homeYellow = ref(initial.value?.homeYellow ?? 0)
  const homeRed = ref(initial.value?.homeRed ?? 0)
  const awayYellow = ref(initial.value?.awayYellow ?? 0)
  const awayRed = ref(initial.value?.awayRed ?? 0)
  const penaltyWinner = ref<'home' | 'away' | undefined>(initial.value?.penaltyWinner)

  const isKnockout = computed(() => match.stage !== 'group')
  const showPenaltyPicker = computed(() => isKnockout.value && homeGoals.value === awayGoals.value)

  watch(showPenaltyPicker, (show) => {
    if (!show) penaltyWinner.value = undefined
  })

  const title = `Ergebnis: ${homeTeam?.name ?? 'Heim'} – ${awayTeam?.name ?? 'Gast'}`

  function save(close: () => void): void {
    store.enterResult({
      matchId: match.id,
      homeGoals: homeGoals.value,
      awayGoals: awayGoals.value,
      homeYellow: homeYellow.value,
      homeRed: homeRed.value,
      awayYellow: awayYellow.value,
      awayRed: awayRed.value,
      ...(showPenaltyPicker.value && penaltyWinner.value ? { penaltyWinner: penaltyWinner.value } : {}),
    })
    announce(
      `Ergebnis gespeichert: ${homeTeam?.name ?? 'Heim'} ${homeGoals.value} : ${awayGoals.value} ${awayTeam?.name ?? 'Gast'}`,
    )
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
    penaltyWinner,
    showPenaltyPicker,
    title,
    initial,
    save,
    clear,
  }
}
