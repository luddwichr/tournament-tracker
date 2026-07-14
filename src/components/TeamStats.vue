<script setup lang="ts">
import CardIcon from './icons/CardIcon.vue'
import type { TeamOverallStats } from '../lib/team-schedule'

defineProps<{ stats: TeamOverallStats }>()
</script>

<template>
  <table class="team-stats tinted-header">
    <caption class="visually-hidden">
      Statistik
    </caption>
    <thead>
      <tr>
        <th scope="col">
          <abbr title="Spiele">Sp</abbr>
          <span class="visually-hidden">Spiele</span>
        </th>
        <th scope="col">
          <abbr title="Siege">S</abbr>
          <span class="visually-hidden">Siege</span>
        </th>
        <th scope="col">
          <abbr title="Unentschieden">U</abbr>
          <span class="visually-hidden">Unentschieden</span>
        </th>
        <th scope="col">
          <abbr title="Niederlagen">N</abbr>
          <span class="visually-hidden">Niederlagen</span>
        </th>
        <th scope="col">
          <abbr title="Tore">T+</abbr>
          <span class="visually-hidden">Tore</span>
        </th>
        <th scope="col">
          <abbr title="Gegentore">T-</abbr>
          <span class="visually-hidden">Gegentore</span>
        </th>
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
