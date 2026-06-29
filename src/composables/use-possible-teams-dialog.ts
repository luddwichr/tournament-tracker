import { ref, computed } from 'vue'
import type { MatchSlot, Team } from '../types/tournament'
import { useTournamentStore } from '../stores/tournament'
import { resolveTeamRef } from '../lib/knockout'
import { teamRefLabel } from '../lib/bracket-labels'
import { possibleTeamsFor } from '../lib/possible-teams'

export function usePossibleTeamsDialog() {
  const store = useTournamentStore()

  const possibleTeamsMatch = ref<MatchSlot | null>(null)
  const possibleTeamsSlot = ref<'home' | 'away' | null>(null)

  const ptHomeTeam = computed(() =>
    possibleTeamsMatch.value ? resolveTeamRef(possibleTeamsMatch.value.homeRef, store.results) : null,
  )
  const ptAwayTeam = computed(() =>
    possibleTeamsMatch.value ? resolveTeamRef(possibleTeamsMatch.value.awayRef, store.results) : null,
  )

  const possibleHome = computed((): Team[] =>
    possibleTeamsMatch.value && possibleTeamsSlot.value === 'home' && !ptHomeTeam.value
      ? [...possibleTeamsFor(possibleTeamsMatch.value.homeRef, store.results)]
      : [],
  )
  const possibleAway = computed((): Team[] =>
    possibleTeamsMatch.value && possibleTeamsSlot.value === 'away' && !ptAwayTeam.value
      ? [...possibleTeamsFor(possibleTeamsMatch.value.awayRef, store.results)]
      : [],
  )

  const homeLabel = computed(() =>
    possibleTeamsMatch.value
      ? (ptHomeTeam.value?.name ?? teamRefLabel(possibleTeamsMatch.value.homeRef))
      : '',
  )
  const awayLabel = computed(() =>
    possibleTeamsMatch.value
      ? (ptAwayTeam.value?.name ?? teamRefLabel(possibleTeamsMatch.value.awayRef))
      : '',
  )

  function open(match: MatchSlot, slot: 'home' | 'away'): void {
    possibleTeamsMatch.value = match
    possibleTeamsSlot.value = slot
  }

  function close(): void {
    possibleTeamsMatch.value = null
    possibleTeamsSlot.value = null
  }

  return { possibleTeamsMatch, possibleHome, possibleAway, homeLabel, awayLabel, open, close }
}
