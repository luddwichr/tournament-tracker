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

type ThirdPlaceStatus = 'none' | 'qualified' | 'eliminated' | 'safe' | 'danger'

const status = computed((): ThirdPlaceStatus => {
  if (props.stat.played === 0) return 'none'
  if (props.final) return inTopEight.value ? 'qualified' : 'eliminated'
  return inTopEight.value ? 'safe' : 'danger'
})

const statusLabel: Record<Exclude<ThirdPlaceStatus, 'none'>, string> = {
  qualified: 'qualifiziert',
  safe: 'aktuell sicher',
  eliminated: 'ausgeschieden',
  danger: 'aktuell nicht sicher',
}

// Left-edge status strip on the team cell — see src/styles/standings-row.css
// for the shared .standings-cell--*-strip recipes.
const stripClass = computed((): string | undefined => {
  if (status.value === 'qualified' || status.value === 'safe') return 'standings-cell--win-strip'
  if (status.value === 'eliminated' || status.value === 'danger') return 'standings-cell--loss-strip'
  return undefined
})

// Row background tint — only once a status is locked in (group stage final).
const tintClass = computed((): string | undefined => {
  if (status.value === 'qualified') return 'standings-cell--win-tint'
  if (status.value === 'eliminated') return 'standings-cell--muted'
  return undefined
})
</script>

<template>
  <tr
    class="third-place-row"
    :class="[
      `third-place-row--${status}`,
      tintClass,
      { 'third-place-row--cutoff': rank === QUALIFYING_THIRDS_COUNT + 1 },
    ]"
  >
    <th scope="row" class="third-place-row__team standings-cell__team" :class="stripClass">
      <div class="third-place-row__team-inner standings-cell__team-inner">
        <span class="third-place-row__rank standings-cell__rank" aria-hidden="true">{{ rank }}</span>
        <span class="third-place-row__group" aria-hidden="true">{{ stat.team.group }}</span>
        <TeamLabel :team="stat.team" clickable />
        <span v-if="status !== 'none'" class="visually-hidden">({{ statusLabel[status] }})</span>
      </div>
    </th>
    <td class="third-place-row__num standings-cell__num third-place-row__pts standings-cell__pts">
      {{ stat.points }}
    </td>
    <td class="third-place-row__num standings-cell__num">{{ stat.goalDiff > 0 ? '+' : '' }}{{ stat.goalDiff }}</td>
    <td class="third-place-row__num standings-cell__num">{{ stat.goalsFor }}</td>
    <td class="third-place-row__num standings-cell__num">{{ stat.fairPlayScore }}</td>
    <td class="third-place-row__num standings-cell__num">{{ stat.team.fifaRanking }}</td>
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

/*
 * Shared team/team-inner/rank/num/pts cell recipes, the status-strip and
 * background-tint utilities, and the team-name clamp all live in
 * src/styles/standings-row.css (shared with StandingsRow.vue). Only the rank
 * cell's width (2ch here vs. 1ch in StandingsRow) and this component's own
 * __group badge are genuinely specific to this table.
 */
.third-place-row__rank {
  width: 2ch;
  flex-shrink: 0;
}

.third-place-row__group {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-muted);
  background-color: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  min-width: 1.5em;
  text-align: center;
  line-height: 1.4;
}
</style>
