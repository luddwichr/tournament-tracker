<script setup lang="ts">
// flag-icons CSS is loaded here (lazy, rides the groups chunk) per main.ts note.
import 'flag-icons/css/flag-icons.min.css'

const props = defineProps<{
  flagCode: string
  size: string
}>()
</script>

<template>
  <span class="team-flag fi" :class="`fi-${flagCode}`" :style="{ fontSize: props.size }" aria-hidden="true" />
</template>

<style scoped>
.team-flag {
  display: inline-block;
  /* flag-icons uses 1.333em width relative to font-size */
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}
</style>
