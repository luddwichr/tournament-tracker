<script lang="ts">
const kickoffFmt = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  month: '2-digit',
  weekday: 'short',
})
</script>

<script setup lang="ts">
import MatchLinkIcon from './icons/MatchLinkIcon.vue'
import { computed } from 'vue'
import { matchNumberLabel } from '../lib/bracket-labels'

const { kickoff, matchId } = defineProps<{
  kickoff: string
  matchId: string
  pinned?: boolean
  /** Render as a plain, non-interactive meta row (no highlight toggle). */
  plain?: boolean
}>()

const emit = defineEmits<{ toggle: [] }>()

const formatted = computed(() => kickoffFmt.format(new Date(kickoff)))
const number = computed(() => matchNumberLabel(matchId))
// The badge abbreviates to "Sp. 73", which a screen reader would read as "Sp Punkt 73".
const spokenNumber = computed(() => `Spiel ${matchId.slice(1)}`)
</script>

<template>
  <div v-if="plain" class="match-card-meta match-card-meta--plain">
    <time class="match-card-meta__kickoff" :datetime="kickoff">{{ formatted }}</time>
    <span class="match-card-meta__number" aria-hidden="true">{{ number }}</span>
    <span class="visually-hidden">{{ spokenNumber }}</span>
  </div>
  <button
    v-else
    type="button"
    class="match-card-meta"
    :class="{ 'match-card-meta--active': pinned }"
    :aria-pressed="pinned ? true : false"
    :aria-label="`Spielverbindungen hervorheben (${spokenNumber}, Anstoß ${formatted})`"
    @click="emit('toggle')"
  >
    <time class="match-card-meta__kickoff" :datetime="kickoff">{{ formatted }}</time>
    <span class="match-card-meta__number" aria-hidden="true">{{ number }}</span>
    <MatchLinkIcon class="match-card-meta__icon" />
  </button>
</template>

<style scoped>
/* Meta row doubles as a touch-friendly toggle that pins the connection highlight */
.match-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  /* min-height keeps the toggle at the 44px tap target (WCAG 2.2 SC 2.5.8);
     the xs <time> alone would leave it around 20px. */
  min-height: var(--tap-target);
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

.match-card-meta--plain {
  cursor: default;
  pointer-events: none;
}

.match-card-meta__kickoff {
  font-size: var(--font-size-xs);
}

/* The auto margin keeps the number next to the kickoff and leaves the link icon on the far edge. */
.match-card-meta__number {
  margin-inline: var(--space-2) auto;
  font-size: var(--font-size-xs);
  font-variant-numeric: tabular-nums;
  opacity: 0.75;
}
</style>
