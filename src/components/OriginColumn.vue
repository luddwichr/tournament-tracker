<script setup lang="ts">
import { computed } from 'vue'
import { GROUP_IDS } from '../types/tournament'
import type { GroupId, ThirdPlaceSlot } from '../types/tournament'
import { toThirdPlaceKey } from '../types/tournament'
import { useTournamentStore } from '../stores/tournament'
import { computeGroupStandings } from '../lib/standings'
import { rankThirdPlaced, QUALIFYING_THIRDS_COUNT } from '../lib/third-place'
import { THIRD_PLACE_ALLOCATION, THIRD_PLACE_SLOT_HOST } from '../data/fixtures-2026'
import TeamFlag from './TeamFlag.vue'

defineProps<{
  highlightedRefs?: readonly string[]
}>()

const emit = defineEmits<{
  teamRefHover: [refKey: string]
  teamRefHoverEnd: []
}>()

const store = useTournamentStore()

// When all 12 groups are complete, maps each qualifying group → its thirdPlace slot.
const thirdPlaceGroupToSlot = computed((): Map<GroupId, ThirdPlaceSlot> => {
  const ranked = rankThirdPlaced(store.results)
  if (!ranked) return new Map()

  const top8 = ranked.slice(0, QUALIFYING_THIRDS_COUNT)
  const qualifyingGroups = toThirdPlaceKey(top8.map((s) => s.team.group))
  const allocation = THIRD_PLACE_ALLOCATION[qualifyingGroups]
  if (!allocation) return new Map()

  const map = new Map<GroupId, ThirdPlaceSlot>()
  for (const [slotStr, hostGroup] of Object.entries(THIRD_PLACE_SLOT_HOST) as [string, GroupId][]) {
    const slot = Number(slotStr) as ThirdPlaceSlot
    const sourceGroup = allocation[hostGroup]
    if (sourceGroup) map.set(sourceGroup, slot)
  }
  return map
})

const allGroupsComplete = computed(() => rankThirdPlaced(store.results) !== null)

interface TeamRow {
  team: ReturnType<typeof computeGroupStandings>[number]['team']
  rank: number
  refKey: string | null
  eliminated: boolean
}

const groupData = computed(() =>
  GROUP_IDS.map((id: GroupId) => {
    const standings = computeGroupStandings(id, store.results)
    const r3Slot = thirdPlaceGroupToSlot.value.get(id) ?? null

    const teams: TeamRow[] = standings.slice(0, 3).map((stat, i) => {
      const rank = i + 1
      let refKey: string | null
      if (rank === 1) refKey = `groupRank:${id}:1`
      else if (rank === 2) refKey = `groupRank:${id}:2`
      else refKey = r3Slot != null ? `thirdPlace:${r3Slot}` : null

      return {
        team: stat.team,
        rank,
        refKey,
        eliminated: rank === 3 && allGroupsComplete.value && r3Slot == null,
      }
    })

    return { id, teams }
  }),
)
</script>

<template>
  <section
    class="origin-column surface-card"
    aria-label="Gruppenphase"
  >
    <header class="origin-column__header sticky-card-header">
      <h2 class="origin-column__title">
        Gruppen
      </h2>
    </header>
    <div class="origin-column__groups">
      <div
        v-for="group in groupData"
        :key="group.id"
        class="origin-column__group"
      >
        <div class="origin-column__group-label">
          Gruppe {{ group.id }}
        </div>
        <div
          v-for="row in group.teams"
          :key="row.rank"
          class="origin-column__team-row"
          :class="{
            'origin-column__team-row--third': row.rank === 3,
            'origin-column__team-row--highlighted': row.refKey !== null && highlightedRefs?.includes(row.refKey),
            'highlight-ring': row.refKey !== null && highlightedRefs?.includes(row.refKey),
            'origin-column__team-row--eliminated': row.eliminated,
            'origin-column__team-row--no-link': !row.refKey,
          }"
          :data-ref-key="row.refKey"
          :tabindex="row.refKey ? 0 : undefined"
          @mouseenter="row.refKey && emit('teamRefHover', row.refKey)"
          @mouseleave="emit('teamRefHoverEnd')"
          @focusin="row.refKey && emit('teamRefHover', row.refKey)"
          @focusout="emit('teamRefHoverEnd')"
        >
          <span
            class="origin-column__rank"
            aria-hidden="true"
          >{{ row.rank }}</span>
          <TeamFlag
            :flag-code="row.team.flagCode"
            :name="row.team.name"
            :decorative="true"
          />
          <span class="origin-column__name">{{ row.team.name }}</span>
          <span
            v-if="row.eliminated"
            class="visually-hidden"
          >(ausgeschieden)</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.origin-column {
  width: 17rem;
  flex-shrink: 0;
  /* surface-card applied via shared class in base.css */
  display: flex;
  flex-direction: column;
}

.origin-column__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 700;
}

.origin-column__groups {
  padding: var(--space-3) var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.origin-column__group {
  display: flex;
  flex-direction: column;
}

.origin-column__group-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-muted);
  padding: var(--space-1) var(--space-2);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--space-1);
}

.origin-column__team-row {
  --flag-size: 1.25rem;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  cursor: pointer;
  user-select: none;
}

.origin-column__team-row:hover {
  background: color-mix(in srgb, var(--color-primary) var(--state-hover), transparent);
  border-color: var(--color-border);
}

/* Rank-3 rows: separated by a dashed top border so the qualification cut is visible */
.origin-column__team-row--third {
  margin-top: var(--space-1);
  border-top-color: var(--color-border);
  border-top-style: dashed;
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
}

.origin-column__team-row--third:hover {
  border-top-color: var(--color-border);
}

.origin-column__team-row--highlighted.origin-column__team-row--third {
  border-top-color: var(--color-primary);
  border-top-style: solid;
}

/* No hover effect for rows with no R32 link */
.origin-column__team-row--no-link {
  cursor: default;
}

.origin-column__team-row--no-link:hover {
  background: none;
  border-color: transparent;
  border-top-color: var(--color-border);
}

/* Rank-3 teams that did not make the top 8 */
.origin-column__team-row--eliminated {
  opacity: 0.4;
  cursor: default;
}

.origin-column__team-row--eliminated:hover {
  background: none;
  border-color: transparent;
  border-top-color: var(--color-border);
}

.origin-column__rank {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  width: 1ch;
  text-align: right;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.origin-column__name {
  font-size: var(--font-size-sm);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
</style>
