<script setup lang="ts">
import BracketView from '../components/BracketView.vue'
import type { MatchSlot } from '../types/tournament'
import { resolveTeamRef } from '../lib/knockout'
import { useScoreDialog } from '../composables/use-score-dialog'
import { useTournamentStore } from '../stores/tournament'

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
    <h1 class="view-heading">K.-o.-Runde</h1>
    <BracketView @match-click="selectMatch" />
  </div>
</template>
