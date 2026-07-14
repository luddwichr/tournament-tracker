import type { MatchSlot, Team } from '../types/tournament'
import { computed, ref } from 'vue'
import { possibleTeamsFor } from '../lib/possible-teams'
import { resolveTeamRef } from '../lib/knockout'
import { teamRefLabel } from '../lib/bracket-labels'
import { useTournamentStore } from '../stores/tournament'

export function usePossibleTeamsDialog() {
  const store = useTournamentStore()

  const match = ref<MatchSlot | null>(null)
  const slot = ref<'home' | 'away' | null>(null)

  const teamRef = computed(() => {
    if (!match.value || !slot.value) return null
    return slot.value === 'home' ? match.value.homeRef : match.value.awayRef
  })

  const isOpen = computed(() => match.value !== null)

  const label = computed((): string => {
    if (!teamRef.value) return ''
    const resolved = resolveTeamRef(teamRef.value, store.results)
    return resolved?.name ?? teamRefLabel(teamRef.value)
  })

  const possibleTeams = computed((): Team[] =>
    teamRef.value && !resolveTeamRef(teamRef.value, store.results)
      ? [...possibleTeamsFor(teamRef.value, store.results)]
      : [],
  )

  function open(newMatch: MatchSlot, newSlot: 'home' | 'away'): void {
    match.value = newMatch
    slot.value = newSlot
  }

  function close(): void {
    match.value = null
    slot.value = null
  }

  return { close, isOpen, label, open, teams: possibleTeams }
}
