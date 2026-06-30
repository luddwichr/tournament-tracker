<script setup lang="ts">
import type { MatchSlot, Team, Result } from '../types/tournament'
import MatchCard from './MatchCard.vue'

defineProps<{
  match: MatchSlot
  homeTeam: Team | null
  awayTeam: Team | null
  result: Result | null
  homePlaceholder: string
  awayPlaceholder: string
  sectionLabel?: string
  highlighted: boolean
  pinned: boolean
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
  <p v-if="sectionLabel" class="bracket-round__section-label">
    {{ sectionLabel }}
  </p>
  <div
    class="bracket-match-item"
    :data-match-id="match.id"
    @mouseenter="emit('matchHover', match.id)"
    @mouseleave="emit('matchHoverEnd')"
    @focusin="emit('matchHover', match.id)"
    @focusout="emit('matchHoverEnd')"
  >
    <MatchCard
      :match="match"
      :home-team="homeTeam"
      :away-team="awayTeam"
      :result="result"
      :home-placeholder="homePlaceholder"
      :away-placeholder="awayPlaceholder"
      :highlighted="highlighted"
      :pinned="pinned"
      @click="emit('matchClick', match)"
      @toggle-highlight="emit('toggleHighlight', match.id)"
      @placeholder-click="(slot) => emit('placeholderClick', match, slot)"
    />
  </div>
</template>

<style scoped>
.bracket-match-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.bracket-round__section-label {
  margin: 0;
  padding: var(--space-1) 0;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--color-border);
}
</style>
