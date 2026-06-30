<script setup lang="ts">
import type { Result } from '../types/tournament'

defineProps<{
  result?: Result | null
  label: string
  disabled?: boolean
}>()

const emit = defineEmits<{ click: [] }>()
</script>

<template>
  <button
    type="button"
    class="match-score-btn"
    :aria-label="label"
    :disabled="disabled ? true : undefined"
    @click.stop="emit('click')"
  >
    <span class="match-score-btn__pill">
      <template v-if="result">
        <span class="match-score-btn__value">{{ result.homeGoals }}</span>
        <span class="match-score-btn__sep">:</span>
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
  align-items: center;
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

/* Inner pill carries the visual chrome so the wide tap target stays compact-looking */
.match-score-btn__pill {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.2em;
  min-width: 2.5rem;
  padding: var(--space-1) var(--space-2);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  transition:
    border-color 0.15s,
    background-color 0.15s;
}

.match-score-btn:hover:not(:disabled) .match-score-btn__pill {
  border-color: var(--color-primary);
  background-color: color-mix(in srgb, var(--color-primary) 8%, transparent);
}

.match-score-btn__value,
.match-score-btn__sep {
  font-weight: 700;
  line-height: 1;
}

.match-score-btn__value {
  font-variant-numeric: tabular-nums;
}

.match-score-btn__dash {
  color: var(--color-text-muted);
}
</style>
