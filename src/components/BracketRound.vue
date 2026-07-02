<script setup lang="ts">
import type { MatchSlot, Team, Result } from '../types/tournament'
import BracketMatchItem from './BracketMatchItem.vue'

export interface MatchRow {
  match: MatchSlot
  homeTeam: Team | null
  awayTeam: Team | null
  result: Result | null
  homePlaceholder: string
  awayPlaceholder: string
  sectionLabel?: string
}

defineProps<{
  title: string
  matches: MatchRow[]
  highlightedMatchIds?: readonly string[]
  pinnedMatchId?: string | null
}>()

const emit = defineEmits<{
  matchClick: [match: MatchSlot]
  matchHover: [matchId: string]
  matchHoverEnd: []
  toggleHighlight: [matchId: string]
  placeholderClick: [match: MatchSlot, slot: 'home' | 'away']
}>()
</script>

<template>
  <section class="bracket-round surface-card" :aria-label="title">
    <header class="bracket-round__header sticky-card-header">
      <h2 class="bracket-round__title">{{ title }}</h2>
    </header>
    <div class="bracket-round__matches">
      <BracketMatchItem
        v-for="row in matches"
        :key="row.match.id"
        v-bind="row"
        :highlighted="!!highlightedMatchIds?.includes(row.match.id)"
        :pinned="pinnedMatchId === row.match.id"
        @match-click="emit('matchClick', $event)"
        @match-hover="emit('matchHover', $event)"
        @match-hover-end="emit('matchHoverEnd')"
        @toggle-highlight="emit('toggleHighlight', $event)"
        @placeholder-click="(match, slot) => emit('placeholderClick', match, slot)"
      />
    </div>
  </section>
</template>

<style scoped>
.bracket-round {
  width: 18rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.bracket-round__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 700;
}

.bracket-round__matches {
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
</style>
