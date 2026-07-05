<script setup lang="ts">
import type { TeamStat } from '../lib/standings'
import type { GroupId } from '../types/tournament'
import StandingsRow from './StandingsRow.vue'

defineProps<{
  standings: TeamStat[]
  groupDone: boolean
  groupId: GroupId
}>()
</script>

<template>
  <section class="group-standings" tabindex="0">
    <table class="standings-table tinted-header">
      <caption class="visually-hidden">
        Tabelle Gruppe
        {{
          groupId
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col" class="standings-table__team-col">Team</th>
          <th scope="col" class="standings-table__num-col">
            <abbr title="Spiele">Sp</abbr>
            <span class="visually-hidden">Spiele</span>
          </th>
          <th scope="col" class="standings-table__num-col">
            <abbr title="Siege">S</abbr>
            <span class="visually-hidden">Siege</span>
          </th>
          <th scope="col" class="standings-table__num-col">
            <abbr title="Unentschieden">U</abbr>
            <span class="visually-hidden">Unentschieden</span>
          </th>
          <th scope="col" class="standings-table__num-col">
            <abbr title="Niederlagen">N</abbr>
            <span class="visually-hidden">Niederlagen</span>
          </th>
          <th scope="col" class="standings-table__num-col">
            <abbr title="Tore">T+</abbr>
            <span class="visually-hidden">Tore</span>
          </th>
          <th scope="col" class="standings-table__num-col">
            <abbr title="Gegentore">T-</abbr>
            <span class="visually-hidden">Gegentore</span>
          </th>
          <th scope="col" class="standings-table__num-col">
            <abbr title="Tordifferenz">TD</abbr>
            <span class="visually-hidden">Tordifferenz</span>
          </th>
          <th scope="col" class="standings-table__num-col">
            <abbr title="Punkte">Pkt</abbr>
            <span class="visually-hidden">Punkte</span>
          </th>
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
  text-align: start;
  padding-inline-start: var(--space-3);
}

.standings-table__num-col {
  min-width: 1.25rem;
}
</style>
