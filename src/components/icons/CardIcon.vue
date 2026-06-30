<script setup lang="ts">
const props = defineProps<{ color: 'yellow' | 'red' }>()
</script>

<template>
  <svg aria-hidden="true" viewBox="0 0 12 16">
    <rect width="12" height="16" rx="2" :fill="props.color === 'yellow' ? '#f5c200' : '#e11d48'" />
  </svg>
</template>
