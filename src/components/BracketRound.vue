<script setup lang="ts">
import { ref, computed } from 'vue'
import type { MatchSlot, Team, Result } from '../types/tournament'
import { useTournamentStore } from '../stores/tournament'
import { resolveTeamRef } from '../lib/knockout'
import { possibleTeamsFor } from '../lib/possible-teams'
import { teamRefLabel } from '../lib/bracket-labels'
import MatchCard from './MatchCard.vue'
import PossibleTeamsDialog from './PossibleTeamsDialog.vue'

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
}>()

const emit = defineEmits<{
  matchClick: [match: MatchSlot]
  matchHover: [matchId: string]
  matchHoverEnd: []
}>()

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
  possibleTeamsMatch.value ? (ptHomeTeam.value?.name ?? teamRefLabel(possibleTeamsMatch.value.homeRef)) : '',
)
const awayLabel = computed(() =>
  possibleTeamsMatch.value ? (ptAwayTeam.value?.name ?? teamRefLabel(possibleTeamsMatch.value.awayRef)) : '',
)

function openPossibleTeams(match: MatchSlot, slot: 'home' | 'away'): void {
  possibleTeamsMatch.value = match
  possibleTeamsSlot.value = slot
}

function closePossibleTeams(): void {
  possibleTeamsMatch.value = null
  possibleTeamsSlot.value = null
}
</script>

<template>
  <section class="bracket-round surface-card" :aria-label="title">
    <header class="bracket-round__header">
      <h2 class="bracket-round__title">{{ title }}</h2>
    </header>
    <div class="bracket-round__matches">
      <template v-for="row in matches" :key="row.match.id">
        <p v-if="row.sectionLabel" class="bracket-round__section-label">
          {{ row.sectionLabel }}
        </p>
        <div
          class="bracket-round__match-group"
          :class="{ 'bracket-round__match-group--target': highlightedMatchIds?.includes(row.match.id) }"
          :data-match-id="row.match.id"
          @mouseenter="emit('matchHover', row.match.id)"
          @mouseleave="emit('matchHoverEnd')"
        >
          <MatchCard
            :match="row.match"
            :home-team="row.homeTeam"
            :away-team="row.awayTeam"
            :result="row.result"
            :home-placeholder="row.homePlaceholder"
            :away-placeholder="row.awayPlaceholder"
            @click="emit('matchClick', row.match)"
            @placeholder-click="(slot) => openPossibleTeams(row.match, slot)"
          />
        </div>
      </template>
    </div>
  </section>

  <Teleport to="body">
    <PossibleTeamsDialog
      v-if="possibleTeamsMatch"
      :home-label="homeLabel"
      :away-label="awayLabel"
      :possible-home="possibleHome"
      :possible-away="possibleAway"
      @close="closePossibleTeams"
    />
  </Teleport>
</template>

<style scoped>
.bracket-round {
  width: 26rem;
  flex-shrink: 0;
  /* surface-card applied via shared class in base.css */
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
  gap: var(--space-3);
}

.bracket-round__match-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.bracket-round__match-group--target :deep(.match-card) {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 25%, transparent);
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
