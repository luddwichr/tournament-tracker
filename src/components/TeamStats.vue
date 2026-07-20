<script setup lang="ts">
import CardIcon from './icons/CardIcon.vue'
import StatHeaderCell from './StatHeaderCell.vue'
import { TEAM_STATS_COLUMNS } from './stat-columns'
import type { TeamOverallStats } from '../lib/team-schedule'

defineProps<{ stats: TeamOverallStats }>()

const columns = TEAM_STATS_COLUMNS
</script>

<template>
  <table class="team-stats stat-table tinted-header">
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
/* Table base and th recipe come from .stat-table (standings-row.css); this
   table additionally centers its body cells. */
.team-stats {
  text-align: center;
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
