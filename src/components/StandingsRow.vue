<script lang="ts">
type StandingsStatus = 'none' | 'qualified' | 'third' | 'eliminated' | 'safe' | 'potential' | 'danger'

const statusLabel: Record<Exclude<StandingsStatus, 'none'>, string> = {
  danger: 'gefährdet',
  eliminated: 'ausgeschieden',
  potential: 'möglicher Dritter',
  qualified: 'qualifiziert',
  safe: 'sicher',
  third: 'Dritter',
}
</script>

<script setup lang="ts">
import TeamLabel from './TeamLabel.vue'
import type { TeamStat } from '../lib/standings'
import { computed } from 'vue'

const { stat, rank, groupDone } = defineProps<{
  stat: TeamStat
  rank: number
  groupDone: boolean
}>()

const status = computed((): StandingsStatus => {
  if (stat.played === 0) return 'none'
  if (groupDone) {
    if (rank <= 2) return 'qualified'
    if (rank === 3) return 'third'
    return 'eliminated'
  }
  if (rank <= 2) return 'safe'
  if (rank === 3) return 'potential'
  return 'danger'
})

// Left-edge status strip on the team cell.
// See src/styles/standings-row.css for the shared .standings-cell--*-strip recipes.
const stripClass = computed((): string | undefined => {
  if (status.value === 'qualified' || status.value === 'safe') return 'standings-cell--win-strip'
  if (status.value === 'third' || status.value === 'potential') return 'standings-cell--draw-strip'
  if (status.value === 'eliminated' || status.value === 'danger') return 'standings-cell--loss-strip'
  return undefined
})

// Row background tint, applied only once a status is locked in and the group is decided.
const tintClass = computed((): string | undefined => {
  if (status.value === 'qualified') return 'standings-cell--win-tint'
  if (status.value === 'third') return 'standings-cell--draw-tint'
  if (status.value === 'eliminated') return 'standings-cell--muted'
  return undefined
})

// Screen-reader substitute for the aria-hidden rank cell: a linear reader must
// hear the table position on every row (the status word only exists once a
// team has played).
const srLabel = computed((): string => {
  const s = status.value
  const position = `Platz ${rank}`
  return s === 'none' ? position : `${position}, ${statusLabel[s]}`
})
</script>

<template>
  <tr class="standings-row" :class="[`standings-row--${status}`, tintClass]">
    <th scope="row" class="standings-row__team standings-cell__team" :class="stripClass">
      <div class="standings-row__team-inner standings-cell__team-inner">
        <span class="standings-row__rank standings-cell__rank" aria-hidden="true">{{ rank }}</span>
        <TeamLabel :team="stat.team" clickable />
        <span class="visually-hidden">{{ srLabel }}</span>
      </div>
    </th>
    <td class="standings-row__num standings-cell__num">
      {{ stat.played }}
    </td>
    <td class="standings-row__num standings-cell__num">
      {{ stat.wins }}
    </td>
    <td class="standings-row__num standings-cell__num">
      {{ stat.draws }}
    </td>
    <td class="standings-row__num standings-cell__num">
      {{ stat.losses }}
    </td>
    <td class="standings-row__num standings-cell__num">
      {{ stat.goalsFor }}
    </td>
    <td class="standings-row__num standings-cell__num">
      {{ stat.goalsAgainst }}
    </td>
    <td class="standings-row__num standings-cell__num">{{ stat.goalDiff > 0 ? '+' : '' }}{{ stat.goalDiff }}</td>
    <td class="standings-row__num standings-cell__num standings-row__pts standings-cell__pts">
      {{ stat.points }}
    </td>
  </tr>
</template>

<style scoped>
.standings-row {
  border-top: 1px solid var(--color-border);
}

/*
 * The <th> itself must stay as display:table-cell so the browser's table
 * layout stretches it to the full row height and the background fills
 * correctly. Flex layout goes on the inner wrapper instead.
 *
 * Shared team/team-inner/rank/num/pts cell recipes, the status-strip and
 * background-tint utilities, and the team-name clamp all live in
 * src/styles/standings-row.css (shared with ThirdPlaceRow.vue). Only the
 * rank cell's width is genuinely component-specific (1ch here vs. 2ch in
 * ThirdPlaceRow, which also reserves space for its group badge).
 */
.standings-row__rank {
  min-width: 1ch;
}
</style>
