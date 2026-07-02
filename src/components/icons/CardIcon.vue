<script setup lang="ts">
const props = defineProps<{ color: 'yellow' | 'red'; count?: number }>()
</script>

<template>
  <svg aria-hidden="true" viewBox="0 0 12 16">
    <rect width="12" height="16" rx="2" :fill="props.color === 'yellow' ? '#f5c200' : '#e11d48'" />
    <text
      v-if="count"
      x="6"
      y="8.3"
      text-anchor="middle"
      dominant-baseline="central"
      font-size="8"
      font-weight="700"
      :fill="props.color === 'yellow' ? '#1a1a1a' : '#ffffff'"
    >
      {{ count }}
    </text>
  </svg>
</template>
