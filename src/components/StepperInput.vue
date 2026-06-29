<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    min?: number
    decLabel: string
    incLabel: string
    size?: 'sm' | 'lg'
  }>(),
  { min: 0, size: 'sm' },
)

const model = defineModel<number>({ required: true })
</script>

<template>
  <div class="stepper" :class="`stepper--${props.size}`">
    <button
      type="button"
      class="stepper__step"
      :aria-label="props.decLabel"
      @click="model = Math.max(props.min, model - 1)"
    >
      −
    </button>
    <span class="stepper__value">{{ model }}</span>
    <button type="button" class="stepper__step" :aria-label="props.incLabel" @click="model = model + 1">+</button>
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
  font-weight: 700;
  line-height: 1;
  background: var(--color-bg);
  border: 2px solid var(--color-border);
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

.stepper__value {
  font-weight: 700;
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
