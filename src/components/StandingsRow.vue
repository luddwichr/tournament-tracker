<script setup lang="ts">
import type { TeamStat } from '../lib/standings'
import TeamLabel from './TeamLabel.vue'

defineProps<{
  stat: TeamStat
  rank: number
}>()
</script>

<template>
  <tr class="standings-row" :class="rank <= 2 ? 'standings-row--qualified' : ''">
    <td class="standings-row__team">
      <span class="standings-row__rank" aria-hidden="true">{{ rank }}</span>
      <TeamLabel :team="stat.team" flag-size="1.5rem" />
    </td>
    <td class="standings-row__num">{{ stat.played }}</td>
    <td class="standings-row__num">{{ stat.wins }}</td>
    <td class="standings-row__num">{{ stat.draws }}</td>
    <td class="standings-row__num">{{ stat.losses }}</td>
    <td class="standings-row__num">{{ stat.goalsFor }}</td>
    <td class="standings-row__num">{{ stat.goalsAgainst }}</td>
    <td class="standings-row__num">{{ stat.goalDiff > 0 ? '+' : '' }}{{ stat.goalDiff }}</td>
    <td class="standings-row__num standings-row__pts">{{ stat.points }}</td>
  </tr>
</template>

<style scoped>
.standings-row {
  border-top: 1px solid var(--color-border);
}

.standings-row--qualified td {
  background-color: color-mix(in srgb, var(--color-primary) 6%, transparent);
}

.standings-row__team {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  white-space: nowrap;
}

.standings-row__rank {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  min-width: 1ch;
  text-align: right;
}

.standings-row__num {
  padding: var(--space-2) var(--space-2);
  text-align: center;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.standings-row__pts {
  font-weight: 700;
  font-size: var(--font-size-lg);
}
</style>
