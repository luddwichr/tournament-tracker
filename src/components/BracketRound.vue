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
  matches: MatchRow[]
}>()

const emit = defineEmits<{ matchClick: [match: MatchSlot] }>()
</script>

<template>
  <section class="bracket-round" :aria-label="title">
    <header class="bracket-round__header">
      <h2 class="bracket-round__title">{{ title }}</h2>
    </header>
    <div class="bracket-round__matches">
      <template v-for="row in matches" :key="row.match.id">
        <p v-if="row.sectionLabel" class="bracket-round__section-label">
          {{ row.sectionLabel }}
        </p>
        <MatchCard
          :match="row.match"
          :home-team="row.homeTeam"
          :away-team="row.awayTeam"
          :result="row.result"
          :home-placeholder="row.homePlaceholder"
          :away-placeholder="row.awayPlaceholder"
          @click="emit('matchClick', row.match)"
        />
      </template>
    </div>
  </section>
</template>

<style scoped>
.bracket-round {
  width: 18rem;
  flex-shrink: 0;
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.bracket-round__header {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: var(--space-3) var(--space-4);
  background-color: var(--color-primary);
  color: var(--color-primary-contrast);
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
  gap: var(--space-2);
}

.bracket-round__section-label {
  margin: var(--space-2) 0 0;
  padding: var(--space-1) 0;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--color-border);
}
</style>
