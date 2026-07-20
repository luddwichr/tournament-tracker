<script setup lang="ts">
import { POSITION_LABEL, sortBySquadPosition } from '../lib/squad'
import type { Player } from '../types/tournament'
import { computed } from 'vue'

const { players } = defineProps<{ players: readonly Player[] }>()

const sorted = computed(() => sortBySquadPosition(players))
</script>

<template>
  <table class="squad-list stat-table tinted-header">
    <caption class="visually-hidden">
      Kader
    </caption>
    <thead>
      <tr>
        <th scope="col" class="squad-list__col--num">#</th>
        <th scope="col" class="squad-list__col--pos">Position</th>
        <th scope="col" class="squad-list__col--name">Name</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="player in sorted" :key="player.number" class="squad-list__row">
        <td class="squad-list__num">
          {{ player.number }}
        </td>
        <td class="squad-list__pos">
          {{ POSITION_LABEL[player.position] }}
        </td>
        <th scope="row" class="squad-list__name">
          {{ player.name }}
        </th>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
/* Table base and th recipe come from .stat-table (standings-row.css); a squad
   list is read as names, not numbers, so it left-aligns and pads wider. */
.squad-list thead th {
  padding: var(--space-1) var(--space-3);
  text-align: start;
}

.squad-list__col--num {
  width: 2.5rem;
  text-align: center;
}

.squad-list__col--pos {
  width: 7rem;
}

.squad-list__row {
  border-top: 1px solid var(--color-border);
}

.squad-list__row:hover {
  background-color: color-mix(in srgb, var(--color-primary) var(--state-hover), transparent);
}

.squad-list__num {
  padding: var(--space-2) var(--space-3);
  text-align: center;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.squad-list__pos {
  padding: var(--space-2) var(--space-3);
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

/* Medium rather than the browser's bold <th> default: a player name is a row
   label, not a heading to scan by. */
.squad-list__name {
  padding: var(--space-2) var(--space-3);
  font-weight: var(--font-weight-medium);
  text-align: start;
}
</style>
