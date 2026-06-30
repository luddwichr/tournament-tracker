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

const props = defineProps<{
  kickoff: string
  pinned?: boolean
}>()

const emit = defineEmits<{ toggle: [] }>()

const formatted = computed(() => kickoffFmt.format(new Date(props.kickoff)))
</script>

<template>
  <button
    type="button"
    class="match-card-meta"
    :class="{ 'match-card-meta--active': pinned }"
    :aria-pressed="pinned ? true : false"
    aria-label="Spielverbindungen hervorheben"
    @click="emit('toggle')"
  >
    <time class="match-card-meta__kickoff" :datetime="kickoff">{{ formatted }}</time>
    <svg
      class="match-card-meta__icon"
      viewBox="0 0 16 16"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M2 4 H6 V12 M2 12 H6 M6 8 H14" />
    </svg>
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
  transition: color 0.15s;
}

.match-card-meta:hover,
.match-card-meta--active {
  color: var(--color-primary);
}

.match-card-meta__kickoff {
  font-size: var(--font-size-xs);
}
</style>
