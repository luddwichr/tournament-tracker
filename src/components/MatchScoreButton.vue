<script setup lang="ts">
import type { Result } from '../types/tournament'

defineProps<{
  result?: Result | null
  label: string
  disabled?: boolean
}>()

const emit = defineEmits<{ openScore: [] }>()
</script>

<template>
  <button
    type="button"
    class="match-score-btn"
    :aria-label="label"
    :disabled="disabled"
    @click.stop="emit('openScore')"
  >
    <span class="match-score-btn__pill" :class="{ 'match-score-btn__pill--split': result }">
      <template v-if="result">
        <span class="match-score-btn__value">{{ result.homeGoals }}</span>
        <span class="match-score-btn__value">{{ result.awayGoals }}</span>
      </template>
      <template v-else>
        <span class="match-score-btn__dash">–</span>
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

.match-score-btn:hover:not(:disabled) .match-score-btn__pill {
  border-color: var(--color-primary);
  background-color: color-mix(in srgb, var(--color-primary) 8%, transparent);
}

.match-score-btn__value {
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.match-score-btn__dash {
  color: var(--color-text-muted);
}
</style>
