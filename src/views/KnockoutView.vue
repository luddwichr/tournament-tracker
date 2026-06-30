<script setup lang="ts">
import { ref, computed } from 'vue'
import type { MatchSlot, Team } from '../types/tournament'
import { useTournamentStore } from '../stores/tournament'
import { resolveTeamRef } from '../lib/knockout'
import BracketView from '../components/BracketView.vue'
import ScoreDialog from '../components/ScoreDialog.vue'

const store = useTournamentStore()
const selectedMatch = ref<MatchSlot | null>(null)

type DialogConfig = { match: MatchSlot; home: Team; away: Team }

const dialogConfig = computed((): DialogConfig | null => {
  const match = selectedMatch.value
  if (!match) return null
  const home = resolveTeamRef(match.homeRef, store.results)
  if (!home) return null
  const away = resolveTeamRef(match.awayRef, store.results)
  if (!away) return null
  return { match, home, away }
})
</script>

<template>
  <div class="knockout-view">
    <h1 class="knockout-view__heading">K.-o.-Runde</h1>
    <BracketView @match-click="selectedMatch = $event" />
    <ScoreDialog
      v-if="dialogConfig"
      :match="dialogConfig.match"
      :home-team="dialogConfig.home"
      :away-team="dialogConfig.away"
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
