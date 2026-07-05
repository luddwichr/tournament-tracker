<script lang="ts">
const kickoffFmt = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})
</script>

<script setup lang="ts">
import { computed } from 'vue'
import MatchLinkIcon from './icons/MatchLinkIcon.vue'

const props = defineProps<{
  kickoff: string
  pinned?: boolean
  hideLinkIcon?: boolean
}>()

const emit = defineEmits<{ toggle: [] }>()

const formatted = computed(() => kickoffFmt.format(new Date(props.kickoff)))
</script>

<template>
  <button
    type="button"
    class="match-card-meta"
    :class="{ 'match-card-meta--active': pinned, 'match-card-meta--static': hideLinkIcon }"
    :aria-pressed="pinned ? true : false"
    aria-label="Spielverbindungen hervorheben"
    @click="emit('toggle')"
  >
    <time class="match-card-meta__kickoff" :datetime="kickoff">{{ formatted }}</time>
    <MatchLinkIcon v-if="!hideLinkIcon" class="match-card-meta__icon" />
  </button>
</template>

<style scoped>
/* Meta row doubles as a touch-friendly toggle that pins the connection highlight */
.match-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--space-1) var(--space-1) var(--space-1) 0;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: color var(--motion-duration-base) var(--motion-easing-standard);
}

.match-card-meta:hover,
.match-card-meta--active {
  color: var(--color-primary);
}

.match-card-meta--static {
  cursor: default;
  pointer-events: none;
}

.match-card-meta__kickoff {
  font-size: var(--font-size-xs);
}
</style>
