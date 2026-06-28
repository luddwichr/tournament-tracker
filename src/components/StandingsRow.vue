<script setup lang="ts">
import { computed } from 'vue'
import type { TeamStat } from '../lib/standings'
import TeamLabel from './TeamLabel.vue'

const props = defineProps<{
  stat: TeamStat
  rank: number
  groupDone: boolean
}>()

const status = computed(() => {
  if (props.stat.played === 0) return 'none'
  if (props.groupDone) {
    if (props.rank <= 2) return 'qualified'
    if (props.rank === 3) return 'third'
    return 'eliminated'
  }
  if (props.rank <= 2) return 'safe'
  if (props.rank === 3) return 'potential'
  return 'danger'
})
</script>

<template>
  <tr class="standings-row" :class="`standings-row--${status}`">
    <td class="standings-row__team">
      <div class="standings-row__team-inner">
        <span class="standings-row__rank" aria-hidden="true">{{ rank }}</span>
        <TeamLabel :team="stat.team" flag-size="1.5rem" :clickable="true" />
      </div>
    </td>
    <td class="standings-row__num">{{ stat.played }}</td>
    <td class="standings-row__num">{{ stat.wins }}</td>
    <td class="standings-row__num">{{ stat.draws }}</td>
    <td class="standings-row__num">{{ stat.losses }}</td>
    <td class="standings-row__num">{{ stat.goalsFor }}</td>
    <td class="standings-row__num">{{ stat.goalsAgainst }}</td>
    <td class="standings-row__num">{{ stat.goalDiff > 0 ? '+' : '' }}{{ stat.goalDiff }}</td>
    <td class="standings-row__num standings-row__pts">{{ stat.points }}</td>
  </tr>
</template>

<style scoped>
.standings-row {
  border-top: 1px solid var(--color-border);
}

/*
 * Left-edge strip: a 4px colored border on the team cell signals qualification
 * status. border-left on the first <td> in a border-collapse:collapse table
 * becomes the table's left edge for that row — clipped neatly by the card's
 * overflow:hidden + border-radius.
 */
.standings-row--qualified .standings-row__team,
.standings-row--safe .standings-row__team {
  border-left: 4px solid var(--color-win);
}

.standings-row--third .standings-row__team,
.standings-row--potential .standings-row__team {
  border-left: 4px solid var(--color-draw);
}

.standings-row--eliminated .standings-row__team,
.standings-row--danger .standings-row__team {
  border-left: 4px solid var(--color-loss);
}

/* Background tints only when the group is decided */
.standings-row--qualified td {
  background-color: color-mix(in srgb, var(--color-win) 8%, transparent);
}

.standings-row--third td {
  background-color: color-mix(in srgb, var(--color-draw) 8%, transparent);
}

.standings-row--eliminated td {
  color: var(--color-text-muted);
}

/*
 * The <td> itself must stay as display:table-cell so the browser's table
 * layout stretches it to the full row height and the background fills
 * correctly. Flex layout goes on the inner wrapper instead.
 */
.standings-row__team {
  white-space: nowrap;
}

.standings-row__team-inner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  white-space: nowrap;
}

.standings-row__rank {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  min-width: 1ch;
  text-align: right;
}

.standings-row__num {
  padding: var(--space-1) 2px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* Allow long team names to truncate so the team column stays compact */
.standings-row__team-inner :deep(.team-label__name) {
  max-width: 6rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

.standings-row__pts {
  font-weight: 700;
  font-size: var(--font-size-base);
}
</style>
