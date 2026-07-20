<script setup lang="ts">
import type { MatchSlot, Result, Team } from '../types/tournament'
import { decidedByShootout, foldedScore } from '../lib/knockout'
import CardIcon from './icons/CardIcon.vue'
import MatchCardMeta from './MatchCardMeta.vue'
import MatchScoreButton from './MatchScoreButton.vue'
import MatchTeamSlot from './MatchTeamSlot.vue'
import { computed } from 'vue'

const { homeTeam, awayTeam, result } = defineProps<{
  match: MatchSlot
  homeTeam: Team | null
  awayTeam: Team | null
  result?: Result | null
  homePlaceholder?: string
  awayPlaceholder?: string
  highlighted?: boolean
  pinned?: boolean
  /** Render the meta row plain (no highlight toggle). */
  plain?: boolean
}>()

const emit = defineEmits<{
  openScore: []
  placeholderClick: [slot: 'home' | 'away']
  toggleHighlight: []
}>()

const blocked = computed(() => homeTeam === null || awayTeam === null)

// Clicking anywhere in the body (the dead space around the score button) opens the
// score dialog. Inner controls (team labels, placeholders, score button) stop
// propagation so they keep their own behaviour.
function onBodyClick(): void {
  if (!blocked.value) emit('openScore')
}

// Appended to a side's goal count in `ariaLabel` so a screen reader user can
// learn about bookings too — the visual card badges next to the score are
// `aria-hidden`, so this text is the only place that information exists.
function cardSummary(yellow: number, red: number): string {
  const parts: string[] = []
  if (yellow) parts.push(`${yellow} ${yellow === 1 ? 'gelbe Karte' : 'gelbe Karten'}`)
  if (red) parts.push(`${red} ${red === 1 ? 'rote Karte' : 'rote Karten'}`)
  return parts.length ? `, ${parts.join(', ')}` : ''
}

const ariaLabel = computed(() => {
  const home = homeTeam?.name ?? 'Heim'
  const away = awayTeam?.name ?? 'Gast'
  if (result) {
    const homeCards = cardSummary(result.homeYellow, result.homeRed)
    const awayCards = cardSummary(result.awayYellow, result.awayRed)
    const score = foldedScore(result)
    // The visual "i.E." badge next to the score is aria-hidden; this is its
    // accessible counterpart.
    const shootout = decidedByShootout(result) ? ' nach Elfmeterschießen' : ''
    return `${home} ${score.home}${homeCards} : ${score.away}${awayCards} ${away}${shootout} – Ergebnis bearbeiten`
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
    <MatchCardMeta :kickoff="match.kickoff" :pinned="!!pinned" :plain="plain" @toggle="emit('toggleHighlight')" />
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

/* The whole body is the click target, so it carries the hover/press feedback
   itself — previously only the score pill lit up, leaving most of the
   clickable area looking inert. */
.match-card:not(.match-card--blocked) .match-card__body {
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: background-color var(--motion-duration-base) var(--motion-easing-standard);
}

.match-card:not(.match-card--blocked) .match-card__body:hover {
  background-color: color-mix(in srgb, var(--color-text) var(--state-hover), transparent);
}

.match-card:not(.match-card--blocked) .match-card__body:active {
  background-color: color-mix(in srgb, var(--color-text) var(--state-pressed), transparent);
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
  height: 0.93rem;
  /* Bump only the in-badge count's legibility, independent of the icon's
     own (small, ratio-locked) footprint. */
  --card-icon-count-size: 0.7rem;
}

.match-card__score {
  grid-column: 3;
  grid-row: 1 / span 2;
  align-self: stretch;
}
</style>
