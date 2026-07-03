<script setup lang="ts">
import { computed } from 'vue'
import type { MatchSlot, Team, Result } from '../types/tournament'
import MatchCardMeta from './MatchCardMeta.vue'
import MatchTeamSlot from './MatchTeamSlot.vue'
import MatchScoreButton from './MatchScoreButton.vue'
import CardIcon from './icons/CardIcon.vue'

const props = defineProps<{
  match: MatchSlot
  homeTeam: Team | null
  awayTeam: Team | null
  result?: Result | null
  homePlaceholder?: string
  awayPlaceholder?: string
  highlighted?: boolean
  pinned?: boolean
  hideLinkIcon?: boolean
}>()

const emit = defineEmits<{
  openScore: []
  placeholderClick: [slot: 'home' | 'away']
  toggleHighlight: []
}>()

const blocked = computed(() => props.homeTeam === null || props.awayTeam === null)

// Clicking anywhere in the body (the dead space around the score button) opens the
// score dialog. Inner controls (team labels, placeholders, score button) stop
// propagation so they keep their own behaviour.
function onBodyClick(): void {
  if (!blocked.value) emit('openScore')
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
    <MatchCardMeta
      :kickoff="match.kickoff"
      :pinned="!!pinned"
      :hide-link-icon="hideLinkIcon"
      @toggle="emit('toggleHighlight')"
    />
    <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions, vuejs-accessibility/click-events-have-key-events -- mouse-only convenience click zone around the real MatchScoreButton control, which is already keyboard-accessible; see REVIEW.md §6 -->
    <div class="match-card__body" @click="onBodyClick">
      <MatchTeamSlot
        :team="homeTeam"
        side="home"
        class="match-card__team match-card__team--home"
        :placeholder="homePlaceholder ?? '?'"
        @placeholder-click="emit('placeholderClick', 'home')"
      />
      <span
        v-if="result?.homeYellow || result?.homeRed"
        class="match-card__cards match-card__cards--home"
        aria-hidden="true"
      >
        <CardIcon v-if="result?.homeYellow" color="yellow" :count="result.homeYellow" class="match-card__card-icon" />
        <CardIcon v-if="result?.homeRed" color="red" :count="result.homeRed" class="match-card__card-icon" />
      </span>

      <MatchTeamSlot
        :team="awayTeam"
        side="away"
        class="match-card__team match-card__team--away"
        :placeholder="awayPlaceholder ?? '?'"
        @placeholder-click="emit('placeholderClick', 'away')"
      />
      <span
        v-if="result?.awayYellow || result?.awayRed"
        class="match-card__cards match-card__cards--away"
        aria-hidden="true"
      >
        <CardIcon v-if="result?.awayYellow" color="yellow" :count="result.awayYellow" class="match-card__card-icon" />
        <CardIcon v-if="result?.awayRed" color="red" :count="result.awayRed" class="match-card__card-icon" />
      </span>

      <MatchScoreButton
        class="match-card__score"
        :result="result ?? null"
        :label="ariaLabel"
        :disabled="blocked"
        @open-score="emit('openScore')"
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

/* Each team is its own row (name, cards, goal); the score button spans both
   rows so it sits vertically centered between them. The whole body is the
   click target via onBodyClick, so the gutters open the score dialog. */
.match-card__body {
  display: grid;
  grid-template-columns: 1fr auto auto;
  grid-template-rows: auto auto;
  align-items: center;
  column-gap: var(--space-2);
  row-gap: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px dashed var(--color-border);
  font-size: var(--font-size-sm);
}

.match-card:not(.match-card--blocked) .match-card__body {
  cursor: pointer;
}

.match-card__team--home {
  grid-column: 1;
  grid-row: 1;
}

.match-card__team--away {
  grid-column: 1;
  grid-row: 2;
}

.match-card__cards {
  display: flex;
  align-items: center;
  gap: 0.15em;
}

.match-card__cards--home {
  grid-column: 2;
  grid-row: 1;
}

.match-card__cards--away {
  grid-column: 2;
  grid-row: 2;
}

.match-card__card-icon {
  width: 0.7rem;
  height: 0.93rem;
}

.match-card__score {
  grid-column: 3;
  grid-row: 1 / span 2;
  align-self: stretch;
}
</style>
