<script setup lang="ts">
import type { GroupId } from '../types/tournament'
import StandingsRow from './StandingsRow.vue'
import StatHeaderCell from './StatHeaderCell.vue'
import type { TeamStat } from '../lib/standings'

defineProps<{
  standings: TeamStat[]
  groupDone: boolean
  groupId: GroupId
}>()

const columns = [
  { abbr: 'Sp', label: 'Spiele' },
  { abbr: 'S', label: 'Siege' },
  { abbr: 'U', label: 'Unentschieden' },
  { abbr: 'N', label: 'Niederlagen' },
  { abbr: 'T+', label: 'Tore' },
  { abbr: 'T-', label: 'Gegentore' },
  { abbr: 'TD', label: 'Tordifferenz' },
  { abbr: 'Pkt', label: 'Punkte' },
]
</script>

<template>
  <section class="group-standings" tabindex="0" :aria-label="`Tabelle Gruppe ${groupId}`">
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
          <StatHeaderCell
            v-for="col in columns"
            :key="col.abbr"
            class="standings-table__num-col"
            :abbr="col.abbr"
            :label="col.label"
          />
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
