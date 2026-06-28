<script setup lang="ts">
import { ref, computed } from 'vue'
import type { MatchSlot, Team } from '../types/tournament'
import { useTournamentStore } from '../stores/tournament'
import { resolveTeamRef } from '../lib/knockout'
import { possibleTeamsFor } from '../lib/possible-teams'
import { teamRefLabel } from '../lib/bracket-labels'
import PossibleTeamsDialog from './PossibleTeamsDialog.vue'

const props = defineProps<{ match: MatchSlot }>()

const store = useTournamentStore()
const dialogOpen = ref(false)

const homeTeam = computed(() => resolveTeamRef(props.match.homeRef, store.results))
const awayTeam = computed(() => resolveTeamRef(props.match.awayRef, store.results))

// Only compute possible teams for unresolved slots to avoid unnecessary work
const possibleHome = computed((): Team[] =>
  homeTeam.value ? [] : [...possibleTeamsFor(props.match.homeRef, store.results)],
)
const possibleAway = computed((): Team[] =>
  awayTeam.value ? [] : [...possibleTeamsFor(props.match.awayRef, store.results)],
)

const homeLabel = computed(() =>
  homeTeam.value ? homeTeam.value.name : teamRefLabel(props.match.homeRef),
)
const awayLabel = computed(() =>
  awayTeam.value ? awayTeam.value.name : teamRefLabel(props.match.awayRef),
)
</script>

<template>
  <button
    type="button"
    class="possible-teams-btn"
    @click="dialogOpen = true"
  >
    Mögliche Teams anzeigen
  </button>

  <Teleport to="body">
    <PossibleTeamsDialog
      v-if="dialogOpen"
      :home-label="homeLabel"
      :away-label="awayLabel"
      :possible-home="possibleHome"
      :possible-away="possibleAway"
      @close="dialogOpen = false"
    />
  </Teleport>
</template>

<style scoped>
.possible-teams-btn {
  display: block;
  width: 100%;
  padding: var(--space-1) var(--space-3);
  background: none;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-family: inherit;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  text-align: center;
  min-height: var(--tap-target);
}

.possible-teams-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 6%, transparent);
}

.possible-teams-btn:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}
</style>
