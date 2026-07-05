<script setup lang="ts">
import type { TeamStat } from '../lib/standings'
import StandingsRow from './StandingsRow.vue'

defineProps<{
  standings: TeamStat[]
  groupDone: boolean
}>()
</script>

<template>
  <section class="group-standings" aria-label="Tabelle" tabindex="0">
    <table class="standings-table tinted-header">
      <caption class="visually-hidden">
        Tabelle
      </caption>
      <thead>
        <tr>
          <th scope="col" class="standings-table__team-col">Team</th>
          <th scope="col" class="standings-table__num-col" title="Spiele">Sp</th>
          <th scope="col" class="standings-table__num-col" title="Siege">S</th>
          <th scope="col" class="standings-table__num-col" title="Unentschieden">U</th>
          <th scope="col" class="standings-table__num-col" title="Niederlagen">N</th>
          <th scope="col" class="standings-table__num-col" title="Tore">T+</th>
          <th scope="col" class="standings-table__num-col" title="Gegentore">T-</th>
          <th scope="col" class="standings-table__num-col" title="Tordifferenz">TD</th>
          <th scope="col" class="standings-table__num-col" title="Punkte">Pkt</th>
        </tr>
      </thead>
      <tbody>
        <StandingsRow
          v-for="(stat, idx) in standings"
          :key="stat.team.id"
          :stat="stat"
          :rank="idx + 1"
          :group-done="groupDone"
        />
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.group-standings {
  overflow-x: auto;
}

.standings-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.standings-table th {
  padding: var(--space-1) var(--space-1);
  text-align: center;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.standings-table thead .standings-table__team-col {
  text-align: left;
  padding-left: var(--space-3);
}

.standings-table__num-col {
  min-width: 1.25rem;
}
</style>
