<script setup lang="ts">
import { computed } from 'vue'
import type { MatchSlot, Team, Result } from '../types/tournament'
import MatchCardMeta from './MatchCardMeta.vue'
import MatchTeamSlot from './MatchTeamSlot.vue'
import MatchScoreButton from './MatchScoreButton.vue'

const props = defineProps<{
  match: MatchSlot
  homeTeam: Team | null
  awayTeam: Team | null
  result?: Result | null
  homePlaceholder?: string
  awayPlaceholder?: string
  highlighted?: boolean
  pinned?: boolean
}>()

const emit = defineEmits<{
  click: []
  placeholderClick: [slot: 'home' | 'away']
  toggleHighlight: []
}>()

const blocked = computed(() => props.homeTeam === null || props.awayTeam === null)

// Clicking anywhere in the body (the dead space around the score button) opens the
// score dialog. Inner controls (team labels, placeholders, score button) stop
// propagation so they keep their own behaviour.
function onBodyClick(): void {
  if (!blocked.value) emit('click')
}

const ariaLabel = computed(() => {
  const home = props.homeTeam?.name ?? 'Heim'
  const away = props.awayTeam?.name ?? 'Gast'
  if (props.result) {
    return `${home} ${props.result.homeGoals} : ${props.result.awayGoals} ${away} – Ergebnis bearbeiten`
  }
  return `${home} – ${away}: Ergebnis eingeben`
})
</script>

<template>
  <div
    class="match-card"
    :class="{
      'match-card--played': !!result,
      'match-card--blocked': blocked,
      'highlight-ring': highlighted,
    }"
  >
    <MatchCardMeta :kickoff="match.kickoff" :pinned="!!pinned" @toggle="emit('toggleHighlight')" />
    <div class="match-card__body" @click="onBodyClick">
      <MatchTeamSlot
        :team="homeTeam"
        side="home"
        :placeholder="homePlaceholder ?? '?'"
        @placeholder-click="emit('placeholderClick', 'home')"
      />
      <MatchScoreButton :result="result ?? null" :label="ariaLabel" :disabled="blocked" @click="emit('click')" />
      <MatchTeamSlot
        :team="awayTeam"
        side="away"
        :placeholder="awayPlaceholder ?? '?'"
        @placeholder-click="emit('placeholderClick', 'away')"
      />
    </div>
  </div>
</template>

<style scoped>
.match-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background-color: var(--color-bg);
  border: 1px solid color-mix(in srgb, var(--color-border) 45%, transparent);
  user-select: none;
}

.match-card--played {
  border-color: var(--color-border);
}

.match-card--blocked {
  border-color: var(--color-border);
  border-style: dashed;
}

/* Teams size to content (equal 1fr gutters keep the button centered); the whole
   body is the click target via onBodyClick, so the gutters open the score dialog */
.match-card__body {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: stretch;
  gap: var(--space-1);
  font-size: var(--font-size-sm);
}

.match-card:not(.match-card--blocked) .match-card__body {
  cursor: pointer;
}
</style>
