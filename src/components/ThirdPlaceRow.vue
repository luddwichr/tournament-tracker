<script setup lang="ts">
import { computed } from 'vue'
import type { TeamStat } from '../lib/standings'
import { QUALIFYING_THIRDS_COUNT } from '../lib/third-place'
import TeamLabel from './TeamLabel.vue'

const props = defineProps<{
  stat: TeamStat
  rank: number
  /** True once all 12 groups have finished — locks the status in as final. */
  final: boolean
}>()

const inTopEight = computed(() => props.rank <= QUALIFYING_THIRDS_COUNT)

const status = computed(() => {
  if (props.stat.played === 0) return 'none'
  if (props.final) return inTopEight.value ? 'qualified' : 'eliminated'
  return inTopEight.value ? 'safe' : 'danger'
})

const statusLabel: Record<string, string> = {
  qualified: 'qualifiziert',
  safe: 'aktuell sicher',
  eliminated: 'ausgeschieden',
  danger: 'aktuell nicht sicher',
}
</script>

<template>
  <tr
    class="third-place-row"
    :class="[`third-place-row--${status}`, { 'third-place-row--cutoff': rank === QUALIFYING_THIRDS_COUNT + 1 }]"
  >
    <th scope="row" class="third-place-row__team">
      <div class="third-place-row__team-inner">
        <span class="third-place-row__rank" aria-hidden="true">{{ rank }}</span>
        <span class="third-place-row__group" aria-hidden="true">{{ stat.team.group }}</span>
        <TeamLabel :team="stat.team" clickable />
        <span v-if="status !== 'none'" class="visually-hidden">({{ statusLabel[status] }})</span>
      </div>
    </th>
    <td class="third-place-row__num third-place-row__pts">{{ stat.points }}</td>
    <td class="third-place-row__num">{{ stat.goalDiff > 0 ? '+' : '' }}{{ stat.goalDiff }}</td>
    <td class="third-place-row__num">{{ stat.goalsFor }}</td>
    <td class="third-place-row__num">{{ stat.fairPlayScore }}</td>
    <td class="third-place-row__num">{{ stat.team.fifaRanking }}</td>
  </tr>
</template>

<style scoped>
.third-place-row {
  border-top: 1px solid var(--color-border);
}

/* Marks the cut between the 8 currently-qualifying teams and the rest. */
.third-place-row--cutoff {
  border-top: 2px dashed var(--color-border);
}

.third-place-row--qualified .third-place-row__team,
.third-place-row--safe .third-place-row__team {
  border-left: 4px solid var(--color-win);
}

.third-place-row--eliminated .third-place-row__team,
.third-place-row--danger .third-place-row__team {
  border-left: 4px solid var(--color-loss);
}

.third-place-row--qualified td {
  background-color: color-mix(in srgb, var(--color-win) 8%, transparent);
}

.third-place-row--eliminated td {
  color: var(--color-text-muted);
}

.third-place-row__team {
  white-space: nowrap;
  font-weight: inherit;
  text-align: left;
}

.third-place-row__team-inner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  white-space: nowrap;
}

.third-place-row__rank {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  width: 2ch;
  flex-shrink: 0;
  text-align: right;
}

.third-place-row__group {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-muted);
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  min-width: 1.5em;
  text-align: center;
  line-height: 1.4;
}

.third-place-row__num {
  padding: var(--space-1) 2px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.third-place-row__team-inner :deep(.team-label__name) {
  max-width: 6rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

.third-place-row__pts {
  font-weight: 700;
  font-size: var(--font-size-base);
}
</style>
