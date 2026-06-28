<script setup lang="ts">
import { computed } from 'vue'
import type { MatchSlot, Team, Result } from '../types/tournament'
import TeamLabel from './TeamLabel.vue'

const props = defineProps<{
  match: MatchSlot
  homeTeam: Team | null
  awayTeam: Team | null
  result?: Result | null
  homePlaceholder?: string
  awayPlaceholder?: string
}>()

const emit = defineEmits<{ click: []; placeholderClick: [] }>()

const blocked = computed(() => props.homeTeam === null || props.awayTeam === null)

const kickoffFmt = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

function formatKickoff(iso: string): string {
  return kickoffFmt.format(new Date(iso))
}

const ariaLabel = computed(() => {
  const home = props.homeTeam?.name ?? 'Heim'
  const away = props.awayTeam?.name ?? 'Gast'
  if (props.result) {
    return `${home} ${props.result.homeGoals} : ${props.result.awayGoals} ${away} – Ergebnis bearbeiten`
  }
  return `${home} – ${away}: Ergebnis eingeben`
})
</script>

<template>
  <div
    class="match-card"
    :class="{ 'match-card--played': !!result, 'match-card--blocked': blocked }"
  >
    <div class="match-card__meta">
      <time class="match-card__kickoff" :datetime="match.kickoff">
        {{ formatKickoff(match.kickoff) }}
      </time>
    </div>
    <div class="match-card__body">
      <span class="match-card__team match-card__team--home">
        <TeamLabel v-if="homeTeam" :team="homeTeam" flag-size="1.5rem" :clickable="true" />
        <button v-else type="button" class="match-card__placeholder" @click="emit('placeholderClick')">
          {{ homePlaceholder ?? '?' }}
        </button>
      </span>

      <!-- Score area is the edit button — a sibling of the team buttons, never a wrapper -->
      <button
        type="button"
        class="match-card__score-btn"
        :aria-label="ariaLabel"
        :disabled="blocked ? true : undefined"
        @click="emit('click')"
      >
        <template v-if="result">
          <span class="match-card__score-value">{{ result.homeGoals }}</span>
          <span class="match-card__score-sep">:</span>
          <span class="match-card__score-value">{{ result.awayGoals }}</span>
        </template>
        <template v-else>
          <span class="match-card__score-dash">–</span>
        </template>
      </button>

      <span class="match-card__team match-card__team--away">
        <TeamLabel v-if="awayTeam" :team="awayTeam" flag-size="1.5rem" :clickable="true" />
        <button v-else type="button" class="match-card__placeholder" @click="emit('placeholderClick')">
          {{ awayPlaceholder ?? '?' }}
        </button>
      </span>
    </div>
  </div>
</template>

<style scoped>
.match-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background-color: var(--color-bg);
  /* Upcoming matches get a faint border so they're visually distinct from the
     surface background; played matches use full border-color opacity. */
  border: 1px solid color-mix(in srgb, var(--color-border) 45%, transparent);
  font-size: inherit;
  user-select: none;
}

.match-card--played {
  border-color: var(--color-border);
}

.match-card--blocked {
  border-color: var(--color-border);
  border-style: dashed;
}

.match-card__meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.match-card__kickoff {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.match-card__body {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-sm);
}

.match-card__team {
  display: flex;
  align-items: center;
  min-width: 0;
}

.match-card__team :deep(.team-label) {
  min-width: 0;
}

.match-card__team :deep(.team-label__name) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.match-card__team--away :deep(.team-label) {
  flex-direction: row-reverse;
}

.match-card__team--away {
  justify-content: flex-end;
}

.match-card__score-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.2em;
  min-width: 2.5rem;
  padding: var(--space-1) var(--space-2);
  background: none;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: inherit;
  color: inherit;
  transition: border-color 0.15s;
}

.match-card__score-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
}

.match-card__score-btn:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

.match-card__score-btn:disabled {
  cursor: not-allowed;
}

.match-card__score-value {
  font-size: var(--font-size-sm);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.match-card__score-sep {
  font-size: var(--font-size-sm);
  font-weight: 700;
  line-height: 1;
}

.match-card__score-dash {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.match-card__placeholder {
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  color: var(--color-text-muted);
  font-style: italic;
  font-size: var(--font-size-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  cursor: pointer;
  border-radius: var(--radius-sm);
}

.match-card__placeholder:hover {
  color: var(--color-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.match-card__placeholder:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}
</style>
