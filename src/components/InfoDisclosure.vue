<script setup lang="ts">
defineProps<{
  summary: string
}>()
</script>

<template>
  <details class="info-disclosure">
    <summary class="info-disclosure__summary">
      <span class="info-disclosure__icon" aria-hidden="true">ℹ️</span>
      {{ summary }}
      <span class="info-disclosure__chevron" aria-hidden="true">▸</span>
    </summary>
    <div class="info-disclosure__body">
      <slot />
    </div>
  </details>
</template>

<style scoped>
.info-disclosure {
  font-size: var(--font-size-sm);
}

.info-disclosure__summary {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  cursor: pointer;
  color: var(--color-primary);
  font-weight: 600;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  min-height: var(--tap-target);
  list-style: none;
}

.info-disclosure__summary::-webkit-details-marker {
  display: none;
}

.info-disclosure__summary:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

.info-disclosure__chevron {
  transition: transform var(--motion-duration-base) var(--motion-easing-standard);
}

.info-disclosure[open] .info-disclosure__chevron {
  transform: rotate(90deg);
}

.info-disclosure__body {
  padding: var(--space-1) var(--space-3) var(--space-3);
}
</style>
