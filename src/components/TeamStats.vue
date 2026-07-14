<script setup lang="ts">
import CardIcon from './icons/CardIcon.vue'
import StatHeaderCell from './StatHeaderCell.vue'
import type { TeamOverallStats } from '../lib/team-schedule'

defineProps<{ stats: TeamOverallStats }>()

const columns = [
  { abbr: 'Sp', label: 'Spiele' },
  { abbr: 'S', label: 'Siege' },
  { abbr: 'U', label: 'Unentschieden' },
  { abbr: 'N', label: 'Niederlagen' },
  { abbr: 'T+', label: 'Tore' },
  { abbr: 'T-', label: 'Gegentore' },
]
</script>

<template>
  <table class="team-stats tinted-header">
    <caption class="visually-hidden">
      Statistik
    </caption>
    <thead>
      <tr>
        <StatHeaderCell v-for="col in columns" :key="col.abbr" :abbr="col.abbr" :label="col.label" />
        <StatHeaderCell label="Gelbe Karten">
          <CardIcon color="yellow" class="team-stats__card-icon" />
        </StatHeaderCell>
        <StatHeaderCell label="Rote Karten">
          <CardIcon color="red" class="team-stats__card-icon" />
        </StatHeaderCell>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="team-stats__num">{{ stats.played }}</td>
        <td class="team-stats__num">{{ stats.wins }}</td>
        <td class="team-stats__num">{{ stats.draws }}</td>
        <td class="team-stats__num">{{ stats.losses }}</td>
        <td class="team-stats__num">{{ stats.goalsFor }}</td>
        <td class="team-stats__num">{{ stats.goalsAgainst }}</td>
        <td class="team-stats__num">{{ stats.yellowCards }}</td>
        <td class="team-stats__num">{{ stats.redCards }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.team-stats {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
  text-align: center;
}

.team-stats th {
  padding: var(--space-1);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.team-stats__num {
  padding: var(--space-2) var(--space-1);
  font-variant-numeric: tabular-nums;
}

.team-stats__card-icon {
  height: 1.2em;
  vertical-align: middle;
}
</style>
