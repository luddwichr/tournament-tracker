<script setup lang="ts">
import InfoDisclosure from './InfoDisclosure.vue'
import type { StatColumn } from './stat-columns'

// Expands the stat tables' abbreviations for readers who cannot decode them.
//
// This is the touch-friendly counterpart to the `<abbr title>` in the header
// cells: a title tooltip needs a hover that a phone cannot produce, and making
// each header cell tappable would force the columns wider than a 360px screen
// allows. One disclosure per table gives a single full-size tap target instead.
defineProps<{
  columns: readonly StatColumn[]
  summary?: string
}>()
</script>

<template>
  <InfoDisclosure :summary="summary ?? 'Was bedeuten die Abkürzungen?'">
    <dl class="stat-legend">
      <div v-for="col in columns" :key="col.abbr" class="stat-legend__item">
        <dt class="stat-legend__abbr">{{ col.abbr }}</dt>
        <dd class="stat-legend__label">{{ col.label }}</dd>
      </div>
    </dl>
  </InfoDisclosure>
</template>

<style scoped>
.stat-legend {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  gap: var(--space-1) var(--space-4);
  margin: 0;
}

.stat-legend__item {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

.stat-legend__abbr {
  flex-shrink: 0;
  min-width: 2.5rem;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.stat-legend__label {
  margin: 0;
  color: var(--color-text-muted);
}
</style>
