<script setup lang="ts">
import type { GroupId, Team } from '../types/tournament'
import MatchLinkIcon from './icons/MatchLinkIcon.vue'
import type { RefKey } from '../lib/bracket-graph'
import TeamFlag from './TeamFlag.vue'

export interface OriginTeamRow {
  team: Team
  rank: number
  refKey: RefKey | null
  eliminated: boolean
}

export interface OriginGroupData {
  id: GroupId
  teams: OriginTeamRow[]
}

defineProps<{
  groupData: OriginGroupData[]
  highlightedRefs?: readonly string[]
}>()

const emit = defineEmits<{
  teamRefHover: [refKey: string]
  teamRefHoverEnd: []
}>()
</script>

<template>
  <section class="origin-column surface-card" aria-label="Gruppenphase">
    <header class="origin-column__header card-header sticky-card-header">
      <h2 class="origin-column__title">Gruppen</h2>
    </header>
    <div class="origin-column__groups">
      <div v-for="group in groupData" :key="group.id" class="origin-column__group">
        <div class="origin-column__group-label">Gruppe {{ group.id }}</div>
        <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions, vuejs-accessibility/mouse-events-have-key-events -- purely a mouse-hover highlight sync with elsewhere in the bracket view; not focusable/keyboard-actionable on purpose (no click/select action, nothing to activate) -->
        <div
          v-for="row in group.teams"
          :key="row.team.id"
          class="origin-column__team-row"
          :class="{
            'origin-column__team-row--third': row.rank === 3,
            'origin-column__team-row--highlighted': row.refKey !== null && highlightedRefs?.includes(row.refKey),
            'highlight-ring': row.refKey !== null && highlightedRefs?.includes(row.refKey),
            'origin-column__team-row--eliminated': row.eliminated,
            'origin-column__team-row--no-link': !row.refKey,
          }"
          :data-ref-key="row.refKey"
          @mouseenter="row.refKey && emit('teamRefHover', row.refKey)"
          @mouseleave="emit('teamRefHoverEnd')"
        >
          <span class="origin-column__rank" aria-hidden="true">{{ row.rank }}</span>
          <TeamFlag :flag-code="row.team.flagCode" size="1.25rem" />
          <span class="origin-column__name">{{ row.team.name }}</span>
          <MatchLinkIcon v-if="row.refKey" class="origin-column__link-icon" />
          <span v-if="row.eliminated" class="visually-hidden">(ausgeschieden)</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.origin-column {
  width: 13rem;
  flex-shrink: 0;
  /* surface-card applied via shared class in base.css */
  display: flex;
  flex-direction: column;
}

.origin-column__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
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
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-muted);
  padding: var(--space-1) var(--space-2);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--space-1);
}

.origin-column__team-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
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
.origin-column__team-row--no-link:hover {
  background: none;
  border-color: transparent;
  border-top-color: var(--color-border);
}

/* Rank-3 teams that did not make the top 8 */
.origin-column__team-row--eliminated {
  opacity: 0.4;
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
  text-align: end;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.origin-column__name {
  flex: 1;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.origin-column__link-icon {
  flex-shrink: 0;
  color: var(--color-text-muted);
}
</style>
