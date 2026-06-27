<script setup lang="ts">
import type { MatchSlot, Team } from '../types/tournament'
import TeamLabel from './TeamLabel.vue'

defineProps<{
  match: MatchSlot
  homeTeam: Team | null
  awayTeam: Team | null
}>()

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
</script>

<template>
  <article class="match-card">
    <time class="match-card__kickoff" :datetime="match.kickoff">
      {{ formatKickoff(match.kickoff) }}
    </time>
    <div class="match-card__teams">
      <span class="match-card__team match-card__team--home">
        <TeamLabel v-if="homeTeam" :team="homeTeam" flag-size="1.5rem" />
        <span v-else class="match-card__placeholder">{{ match.homeRef.kind }}</span>
      </span>
      <span class="match-card__vs" aria-hidden="true">–</span>
      <span class="match-card__team match-card__team--away">
        <TeamLabel v-if="awayTeam" :team="awayTeam" flag-size="1.5rem" />
        <span v-else class="match-card__placeholder">{{ match.awayRef.kind }}</span>
      </span>
    </div>
  </article>
</template>

<style scoped>
.match-card {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background-color: var(--color-bg);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.match-card__kickoff {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.match-card__teams {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.match-card__team {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.match-card__team--away {
  justify-content: flex-end;
}

.match-card__vs {
  font-weight: 700;
  font-size: var(--font-size-base);
  flex-shrink: 0;
}

.match-card__placeholder {
  color: var(--color-text-muted);
  font-style: italic;
  font-size: var(--font-size-sm);
}
</style>
