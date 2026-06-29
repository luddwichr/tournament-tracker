<script setup lang="ts">
// flag-icons CSS is loaded here (lazy, rides the groups chunk) per main.ts note.
import 'flag-icons/css/flag-icons.min.css'

defineProps<{
  flagCode: string
  /** German team name — used as accessible label when not decorative. */
  name: string
  /** Pass true when the flag sits beside a visible team name so AT skips the duplicate. */
  decorative?: boolean
}>()
</script>

<template>
  <span
    class="team-flag fi"
    :class="`fi-${flagCode}`"
    :role="decorative ? undefined : 'img'"
    :aria-label="decorative ? undefined : name"
    :aria-hidden="decorative ? 'true' : undefined"
  ></span>
</template>

<style scoped>
.team-flag {
  display: inline-block;
  /* flag-icons uses 1.333em width relative to font-size; consumers set --flag-size */
  font-size: var(--flag-size, 2rem);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}
</style>
