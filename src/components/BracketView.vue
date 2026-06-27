<script setup lang="ts">
import { computed } from 'vue'
import type { MatchSlot } from '../types/tournament'
import { knockoutMatches } from '../data/fixtures-2026'
import { useTournamentStore } from '../stores/tournament'
import { resolveTeamRef } from '../lib/knockout'
import { teamRefLabel } from '../lib/bracket-labels'
import BracketRound, { type MatchRow } from './BracketRound.vue'

const emit = defineEmits<{ matchClick: [match: MatchSlot] }>()

const store = useTournamentStore()

function toRow(match: MatchSlot, sectionLabel?: string): MatchRow {
  const base = {
    match,
    homeTeam: resolveTeamRef(match.homeRef, store.results),
    awayTeam: resolveTeamRef(match.awayRef, store.results),
    result: store.results[match.id] ?? null,
    homePlaceholder: teamRefLabel(match.homeRef),
    awayPlaceholder: teamRefLabel(match.awayRef),
  }
  return sectionLabel !== undefined ? { ...base, sectionLabel } : base
}

interface Round {
  title: string
  matches: MatchRow[]
}

const rounds = computed((): Round[] => {
  const r = store.results
  void r // ensure reactivity

  const stageRounds: { title: string; stage: string }[] = [
    { title: 'Runde der 32', stage: 'r32' },
    { title: 'Achtelfinale', stage: 'r16' },
    { title: 'Viertelfinale', stage: 'qf' },
    { title: 'Halbfinale', stage: 'sf' },
  ]

  const groups: Round[] = stageRounds.map(({ title, stage }) => ({
    title,
    matches: knockoutMatches.filter((m) => m.stage === stage).map((m) => toRow(m)),
  }))

  const thirdMatch = knockoutMatches.find((m) => m.stage === 'third')!
  const finalMatch = knockoutMatches.find((m) => m.stage === 'final')!

  groups.push({
    title: 'Finale',
    matches: [toRow(thirdMatch, 'Spiel um Platz 3'), toRow(finalMatch, 'Finale')],
  })

  return groups
})
</script>

<template>
  <div class="bracket-view" role="region" aria-label="K.-o.-Runde" tabindex="0">
    <div class="bracket-view__rounds">
      <BracketRound
        v-for="round in rounds"
        :key="round.title"
        :title="round.title"
        :matches="round.matches"
        @match-click="emit('matchClick', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.bracket-view {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: var(--space-4);
}

.bracket-view__rounds {
  display: flex;
  gap: var(--space-5);
  align-items: flex-start;
  min-width: max-content;
  padding: var(--space-1) var(--space-1) var(--space-2);
}
</style>
