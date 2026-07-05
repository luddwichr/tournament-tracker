<script setup lang="ts">
import type { MatchSlot, Team, Result } from '../types/tournament'
import MatchCard from './MatchCard.vue'

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
  stage: string
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
  <section class="bracket-round surface-card" :aria-label="title" :data-stage="stage">
    <header class="bracket-round__header card-header sticky-card-header">
      <h2 class="bracket-round__title">{{ title }}</h2>
    </header>
    <div class="bracket-round__matches">
      <template v-for="row in matches" :key="row.match.id">
        <p v-if="row.sectionLabel" class="bracket-round__section-label">
          {{ row.sectionLabel }}
        </p>
        <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- mouse/focus-only hover-highlight sync; the click action lives on the nested MatchCard's real controls, see REVIEW.md §6 -->
        <div
          class="bracket-match-item"
          :data-match-id="row.match.id"
          @mouseenter="emit('matchHover', row.match.id)"
          @mouseleave="emit('matchHoverEnd')"
          @focusin="emit('matchHover', row.match.id)"
          @focusout="emit('matchHoverEnd')"
        >
          <MatchCard
            :match="row.match"
            :home-team="row.homeTeam"
            :away-team="row.awayTeam"
            :result="row.result"
            :home-placeholder="row.homePlaceholder"
            :away-placeholder="row.awayPlaceholder"
            :highlighted="!!highlightedMatchIds?.includes(row.match.id)"
            :pinned="pinnedMatchId === row.match.id"
            @open-score="emit('matchClick', row.match)"
            @toggle-highlight="emit('toggleHighlight', row.match.id)"
            @placeholder-click="(slot) => emit('placeholderClick', row.match, slot)"
          />
        </div>
      </template>
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
  font-weight: var(--font-weight-bold);
}

.bracket-round__matches {
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.bracket-round__section-label {
  margin: 0;
  padding: var(--space-1) 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--color-border);
}

.bracket-match-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
