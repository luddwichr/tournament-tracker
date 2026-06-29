<script setup lang="ts">
import { ref, computed } from 'vue'
import type { MatchSlot } from '../types/tournament'
import { useTournamentStore } from '../stores/tournament'
import { resolveTeamRef } from '../lib/knockout'
import BracketView from '../components/BracketView.vue'
import ScoreDialog from '../components/ScoreDialog.vue'

const store = useTournamentStore()
const selectedMatch = ref<MatchSlot | null>(null)

const selectedHome = computed(() =>
  selectedMatch.value ? resolveTeamRef(selectedMatch.value.homeRef, store.results) : null,
)
const selectedAway = computed(() =>
  selectedMatch.value ? resolveTeamRef(selectedMatch.value.awayRef, store.results) : null,
)
</script>

<template>
  <div class="knockout-view">
    <h1 class="knockout-view__heading">K.-o.-Runde</h1>
    <BracketView @match-click="selectedMatch = $event" />
    <ScoreDialog
      v-if="selectedMatch && selectedHome && selectedAway"
      :match="selectedMatch"
      :home-team="selectedHome"
      :away-team="selectedAway"
      @close="selectedMatch = null"
    />
  </div>
</template>

<style scoped>
.knockout-view__heading {
  margin: 0 0 var(--space-4);
  font-size: var(--font-size-lg);
  font-weight: 700;
}
</style>
