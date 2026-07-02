<script setup lang="ts">
import type { TeamOverallStats } from '../lib/team-schedule'
import CardIcon from './icons/CardIcon.vue'

defineProps<{ stats: TeamOverallStats }>()
</script>

<template>
  <table class="team-stats tinted-header">
    <caption class="visually-hidden">
      Statistik
    </caption>
    <thead>
      <tr>
        <th scope="col" title="Spiele">Sp</th>
        <th scope="col" title="Siege">S</th>
        <th scope="col" title="Unentschieden">U</th>
        <th scope="col" title="Niederlagen">N</th>
        <th scope="col" title="Tore">T+</th>
        <th scope="col" title="Gegentore">T-</th>
        <th scope="col">
          <CardIcon color="yellow" class="team-stats__card-icon" />
          <span class="visually-hidden">Gelbe Karten</span>
        </th>
        <th scope="col">
          <CardIcon color="red" class="team-stats__card-icon" />
          <span class="visually-hidden">Rote Karten</span>
        </th>
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
  font-weight: 600;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.team-stats__num {
  padding: var(--space-2) var(--space-1);
  font-variant-numeric: tabular-nums;
}

.team-stats__card-icon {
  width: 0.6rem;
  height: 1.1rem;
  vertical-align: middle;
}
</style>
