<script setup lang="ts">
import { GROUP_STANDINGS_COLUMNS } from './stat-columns'
import type { GroupId } from '../types/tournament'
import StandingsRow from './StandingsRow.vue'
import StatHeaderCell from './StatHeaderCell.vue'
import type { TeamStat } from '../lib/standings'

defineProps<{
  standings: TeamStat[]
  groupDone: boolean
  groupId: GroupId
}>()

const columns = GROUP_STANDINGS_COLUMNS
</script>

<template>
  <section class="group-standings" tabindex="0" :aria-label="`Tabelle Gruppe ${groupId}`">
    <table class="standings-table stat-table tinted-header">
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

/* Table base and th recipe come from .stat-table (standings-row.css). */
.standings-table thead .standings-table__team-col {
  text-align: start;
  padding-inline-start: var(--space-3);
}

.standings-table__num-col {
  min-width: 1.25rem;
}
</style>
