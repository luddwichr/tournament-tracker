<script setup lang="ts">
import { computed } from 'vue'
import type { Player } from '../types/tournament'
import { POSITION_LABEL, sortBySquadPosition } from '../lib/squad'

const props = defineProps<{ players: readonly Player[] }>()

const sorted = computed(() => sortBySquadPosition(props.players))
</script>

<template>
  <table class="squad-list tinted-header">
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
.squad-list {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.squad-list thead th {
  padding: var(--space-1) var(--space-3);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-muted);
  text-align: start;
  white-space: nowrap;
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

.squad-list__name {
  padding: var(--space-2) var(--space-3);
  font-weight: 500;
  text-align: start;
}
</style>
