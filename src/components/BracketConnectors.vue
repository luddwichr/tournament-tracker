<script setup lang="ts">
defineProps<{ paths: readonly string[] }>()
</script>

<template>
  <svg class="bracket-connectors" aria-hidden="true">
    <path v-for="(path, i) in paths" :key="i" :d="path" class="bracket-connectors__path" />
  </svg>
</template>

<style scoped>
.bracket-connectors {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
}

.bracket-connectors__path {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 2.5;
  stroke-opacity: 0.65;
  stroke-linecap: round;
}
</style>
