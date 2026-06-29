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

  const teamRef = computed(() => {
    if (!possibleTeamsMatch.value || !possibleTeamsSlot.value) return null
    return possibleTeamsSlot.value === 'home' ? possibleTeamsMatch.value.homeRef : possibleTeamsMatch.value.awayRef
  })

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

  function open(match: MatchSlot, slot: 'home' | 'away'): void {
    possibleTeamsMatch.value = match
    possibleTeamsSlot.value = slot
  }

  function close(): void {
    possibleTeamsMatch.value = null
    possibleTeamsSlot.value = null
  }

  return { possibleTeamsMatch, possibleTeams, label, open, close }
}
