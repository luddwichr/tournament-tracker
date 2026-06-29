<script setup lang="ts">
import { computed } from 'vue'
import type { Player } from '../types/tournament'

type Position = NonNullable<Player['position']>

const props = defineProps<{ players: Player[] }>()

const POSITION_LABEL: Record<Position, string> = {
  GK: 'Torwart',
  DF: 'Abwehr',
  MF: 'Mittelfeld',
  FW: 'Sturm',
}

const POSITION_ORDER: Record<Position, number> = { GK: 0, DF: 1, MF: 2, FW: 3 }

const sorted = computed(() =>
  props.players.toSorted((a, b) => {
    const pa = a.position != null ? POSITION_ORDER[a.position] : 99
    const pb = b.position != null ? POSITION_ORDER[b.position] : 99
    return pa !== pb ? pa - pb : a.number - b.number
  }),
)
</script>

<template>
  <table class="squad-list">
    <thead>
      <tr>
        <th scope="col" class="squad-list__col--num">#</th>
        <th scope="col" class="squad-list__col--pos">Position</th>
        <th scope="col" class="squad-list__col--name">Name</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="player in sorted" :key="player.number" class="squad-list__row">
        <td class="squad-list__num">{{ player.number }}</td>
        <td class="squad-list__pos">
          {{ player.position ? (POSITION_LABEL[player.position] ?? player.position) : '—' }}
        </td>
        <td class="squad-list__name">{{ player.name }}</td>
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

.squad-list thead tr {
  background-color: color-mix(in srgb, var(--color-primary) 8%, transparent);
}

.squad-list th {
  padding: var(--space-1) var(--space-3);
  font-weight: 600;
  color: var(--color-text-muted);
  text-align: left;
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
  background-color: color-mix(in srgb, var(--color-primary) 4%, transparent);
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
}
</style>
