<script setup lang="ts">
// The flag-icons subset is loaded here (lazy, rides the groups chunk) per main.ts note.
import '../styles/flags.scss'

defineProps<{
  flagCode: string
  size: string
}>()
</script>

<template>
  <span class="team-flag fi" :class="`fi-${flagCode}`" :style="{ fontSize: size }" aria-hidden="true" />
</template>

<style scoped>
.team-flag {
  display: inline-block;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}
</style>
