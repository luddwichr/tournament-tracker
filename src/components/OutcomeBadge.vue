<script setup lang="ts">
import type { MatchOutcome } from '../lib/standings'

const props = defineProps<{ outcome: MatchOutcome }>()

const LABELS: Record<MatchOutcome, string> = { W: 'S', D: 'U', L: 'N' }
const ARIA: Record<MatchOutcome, string> = { W: 'Sieg', D: 'Unentschieden', L: 'Niederlage' }
</script>

<template>
  <span
    class="outcome-badge"
    :class="`outcome-badge--${props.outcome.toLowerCase()}`"
    :aria-label="ARIA[props.outcome]"
    role="img"
  >{{ LABELS[props.outcome] }}</span>
</template>

<style scoped>
.outcome-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.4em;
  height: 1.4em;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
  color: #fff;
}

.outcome-badge--w {
  background-color: var(--color-win);
}

.outcome-badge--d {
  background-color: var(--color-draw);
}

.outcome-badge--l {
  background-color: var(--color-loss);
}
</style>
