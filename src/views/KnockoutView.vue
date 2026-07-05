<script setup lang="ts">
import type { MatchSlot } from '../types/tournament'
import { useTournamentStore } from '../stores/tournament'
import { resolveTeamRef } from '../lib/knockout'
import { useScoreDialog } from '../composables/use-score-dialog'
import BracketView from '../components/BracketView.vue'

const store = useTournamentStore()
const openScoreDialog = useScoreDialog()

function selectMatch(match: MatchSlot): void {
  const home = resolveTeamRef(match.homeRef, store.results)
  if (!home) return
  const away = resolveTeamRef(match.awayRef, store.results)
  if (!away) return
  openScoreDialog(match, home, away)
}
</script>

<template>
  <div class="knockout-view">
    <h1 class="knockout-view__heading">K.-o.-Runde</h1>
    <BracketView @match-click="selectMatch" />
  </div>
</template>

<style scoped>
.knockout-view__heading {
  margin: 0 0 var(--space-4);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}
</style>
