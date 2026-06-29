<script setup lang="ts">
// flag-icons CSS is loaded here (lazy, rides the groups chunk) per main.ts note.
import 'flag-icons/css/flag-icons.min.css'

const props = defineProps<{
  flagCode: string
  /** German team name — used as accessible label when not decorative. */
  name: string
  /** Pass true when the flag sits beside a visible team name so AT skips the duplicate. */
  decorative?: boolean
  /* Size of the flag icon, e.g. "2rem" or "1.5 */
  size: string
}>()
</script>

<template>
  <span
    class="team-flag fi"
    :class="`fi-${flagCode}`"
    :style="{ fontSize: props.size }"
    :role="decorative ? undefined : 'img'"
    :aria-label="decorative ? undefined : name"
    :aria-hidden="decorative ? 'true' : undefined"
  />
</template>

<style scoped>
.team-flag {
  display: inline-block;
  /* flag-icons uses 1.333em width relative to font-size */
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}
</style>
