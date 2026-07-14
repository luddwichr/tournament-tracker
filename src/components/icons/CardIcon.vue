<script setup lang="ts">
defineProps<{ color: 'yellow' | 'red'; count?: number }>()
</script>

<template>
  <span class="card-icon" aria-hidden="true">
    <svg viewBox="0 0 12 16">
      <rect width="12" height="16" rx="2" :fill="color === 'yellow' ? '#f5c200' : '#e11d48'" />
    </svg>
    <span v-if="count" class="card-icon__count" :style="{ color: color === 'yellow' ? '#1a1a1a' : '#ffffff' }">
      {{ count }}
    </span>
  </span>
</template>

<style scoped>
/* Fixed 12:16 (0.75) aspect ratio so callers only ever pick a single dimension
   (height or width) and the other follows automatically. */
.card-icon {
  position: relative;
  display: inline-block;
  aspect-ratio: 12 / 16;
}

.card-icon svg {
  display: block;
  width: 100%;
  height: 100%;
}

/* Rendered as real text overlaid on the icon rather than an in-glyph SVG
   <text>, so it can be sized legibly independent of the icon's own scale.
   --card-icon-count-size lets a call site (e.g. MatchCard) bump legibility
   without affecting the icon's footprint. */
.card-icon__count {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--card-icon-count-size, 0.55em);
  font-weight: 700;
  line-height: 1;
}
</style>
