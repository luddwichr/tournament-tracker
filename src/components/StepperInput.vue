<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    decLabel: string
    incLabel: string
    size?: 'sm' | 'lg'
  }>(),
  { size: 'sm' },
)

const model = defineModel<number>({ required: true })

// decLabel/incLabel share a common lead-in (e.g. "Tor für Team A abziehen" /
// "… hinzufügen"). Reuse it to name the value so it isn't a naked number —
// screen readers announce e.g. "Tor für Team A, spin button, 3".
const valueLabel = computed(() => {
  const { decLabel, incLabel } = props
  let i = 0
  while (i < decLabel.length && i < incLabel.length && decLabel[i] === incLabel[i]) i++
  return decLabel.slice(0, i).trim() || `${decLabel} / ${incLabel}`
})

function decrement() {
  model.value = Math.max(0, model.value - 1)
}

function increment() {
  model.value = model.value + 1
}

function onValueKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    increment()
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    decrement()
  } else if (event.key === 'Home') {
    event.preventDefault()
    model.value = 0
  }
}
</script>

<template>
  <div class="stepper" :class="`stepper--${size}`">
    <button type="button" class="stepper__step" :aria-label="decLabel" :disabled="model === 0" @click="decrement">
      −
    </button>
    <span
      class="stepper__value"
      role="spinbutton"
      tabindex="0"
      :aria-label="valueLabel"
      :aria-valuenow="model"
      aria-valuemin="0"
      aria-live="polite"
      aria-atomic="true"
      @keydown="onValueKeydown"
      >{{ model }}</span
    >
    <button type="button" class="stepper__step" :aria-label="incLabel" @click="increment">+</button>
  </div>
</template>

<style scoped>
.stepper {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.stepper--lg {
  gap: var(--space-2);
}

.stepper__step {
  width: var(--tap-target);
  height: var(--tap-target);
  font-weight: var(--font-weight-bold);
  line-height: 1;
  background: var(--color-bg);
  border: 2px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stepper--sm .stepper__step {
  font-size: var(--font-size-lg);
}

.stepper--lg .stepper__step {
  font-size: var(--font-size-xl);
}

.stepper__step:hover {
  background: color-mix(in srgb, var(--color-primary) var(--state-hover), transparent);
  border-color: var(--color-primary);
}

.stepper__step:active {
  background: color-mix(in srgb, var(--color-primary) var(--state-pressed), transparent);
}

.stepper__step:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.stepper__value {
  font-weight: var(--font-weight-bold);
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.stepper--sm .stepper__value {
  font-size: var(--font-size-lg);
  min-width: 1.5rem;
}

.stepper--lg .stepper__value {
  font-size: var(--font-size-score);
  line-height: 1;
  min-width: 2rem;
}
</style>
