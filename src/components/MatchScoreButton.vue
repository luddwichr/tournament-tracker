<script setup lang="ts">
import { decidedByShootout, foldedScore } from '../lib/knockout'
import type { Result } from '../types/tournament'
import { computed } from 'vue'

/**
 * The button's spoken name, split around the visible goals.
 * Each part renders as visually hidden text next to the goals, so the goals a sighted user sees stay part of the
 * name (WCAG 2.5.3 Label in Name).
 */
export interface ScoreLabel {
  /** Text before the home goals, or the whole name while there is no result. */
  readonly beforeHome: string
  readonly betweenGoals: string
  readonly afterAway: string
}

const { result } = defineProps<{
  result?: Result | null
  label: ScoreLabel
  disabled?: boolean
}>()

const emit = defineEmits<{ openScore: [] }>()

/** Folded score for display, including shootout goals, which the i.E. badge marks. */
const score = computed(() => (result ? foldedScore(result) : null))
const shootout = computed(() => (result ? decidedByShootout(result) : false))
</script>

<template>
  <button type="button" class="match-score-btn" :disabled="disabled" @click.stop="emit('openScore')">
    <span
      class="match-score-btn__pill"
      :class="{ 'match-score-btn__pill--split': score, 'match-score-btn__pill--shootout': shootout }"
    >
      <!-- The hidden parts are absolutely positioned, so they take no cell in the pill's grid. -->
      <span class="visually-hidden">{{ label.beforeHome }}</span>
      <template v-if="score">
        <span class="match-score-btn__value">{{ score.home }}</span>
        <!-- Announced as "nach Elfmeterschießen" in the hidden name text, see MatchCard. -->
        <span v-if="shootout" class="match-score-btn__shootout" aria-hidden="true">i.E.</span>
        <span class="visually-hidden">{{ label.betweenGoals }}</span>
        <span class="match-score-btn__value">{{ score.away }}</span>
        <span class="visually-hidden">{{ label.afterAway }}</span>
      </template>
      <template v-else>
        <span class="match-score-btn__dash" aria-hidden="true">–</span>
      </template>
    </span>
  </button>
</template>

<style scoped>
.match-score-btn {
  display: flex;
  align-items: stretch;
  justify-content: center;
  min-height: var(--tap-target);
  padding: 0 var(--space-1);
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  font-size: var(--font-size-sm);
}

.match-score-btn:disabled {
  cursor: not-allowed;
}

/* Inner pill carries the visual chrome so the wide tap target stays compact-looking.
   The button is stretched to span both team rows (see .match-card__score), so the
   dash centers across that full height by default. Once a result exists, --split
   divides the pill into two equal halves so each goal centers on its own team's
   row, keeping the same line height as the team label next to it. */
.match-score-btn__pill {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  transition:
    border-color var(--motion-duration-base) var(--motion-easing-standard),
    background-color var(--motion-duration-base) var(--motion-easing-standard);
}

.match-score-btn__pill--split {
  display: grid;
  grid-template-rows: 1fr 1fr;
  align-items: center;
  justify-items: center;
  row-gap: var(--space-2);
}

/* The i.E. badge sits in the gap between the two goal rows (like the dash,
   it belongs to neither team), so the values keep lining up with their team
   rows as closely as possible. */
.match-score-btn__pill--shootout {
  grid-template-rows: 1fr auto 1fr;
  row-gap: var(--space-1);
}

.match-score-btn__shootout {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-muted);
  line-height: 1;
}

.match-score-btn:hover:not(:disabled) .match-score-btn__pill {
  border-color: var(--color-primary);
  background-color: color-mix(in srgb, var(--color-primary) 8%, transparent);
}

/* Press feedback: the pill lifts onto the elevation scale, which otherwise
   never responds to interaction anywhere in the app. */
.match-score-btn:active:not(:disabled) .match-score-btn__pill {
  background-color: color-mix(in srgb, var(--color-primary) var(--state-pressed), transparent);
  box-shadow: var(--elevation-1);
}

.match-score-btn__value {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.match-score-btn__dash {
  color: var(--color-text-muted);
}
</style>
