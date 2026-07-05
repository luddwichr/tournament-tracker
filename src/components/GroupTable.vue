<script setup lang="ts">
import { computed } from 'vue'
import type { GroupId, GroupMatchSlot, ResolvedTeamRef, Team } from '../types/tournament'
import { teamsById } from '../data/teams'
import { groupMatches } from '../data/fixtures-2026'
import { useTournamentStore } from '../stores/tournament'
import { useScoreDialog } from '../composables/use-score-dialog'
import MatchCard from './MatchCard.vue'
import GroupStandingsTable from './GroupStandingsTable.vue'

const props = defineProps<{ groupId: GroupId }>()

const store = useTournamentStore()
const openScoreDialog = useScoreDialog()

const matches = computed(() => groupMatches.filter((m) => m.group === props.groupId))

const standings = computed(() => store.standingsByGroup.get(props.groupId) ?? [])
const groupDone = computed(() => standings.value.every((s) => s.played === 3))

// Group matches always reference concrete teams (`GroupMatchSlot`/`ResolvedTeamRef`
// guarantee it at the type level), so the only way this misses is an unknown id.
function resolveTeam(teamRef: ResolvedTeamRef): Team | null {
  return teamsById.get(teamRef.teamId) ?? null
}

function selectMatch(match: GroupMatchSlot): void {
  const home = resolveTeam(match.homeRef)
  const away = resolveTeam(match.awayRef)
  if (home !== null && away !== null) openScoreDialog(match, home, away)
}
</script>

<template>
  <article class="group-table surface-card" :aria-label="`Gruppe ${groupId}`">
    <header class="group-table__header card-header">
      <h2 class="group-table__title">Gruppe {{ groupId }}</h2>
    </header>

    <GroupStandingsTable :standings="standings" :group-done="groupDone" :group-id="groupId" />

    <section class="group-table__matches" :aria-label="`Spiele Gruppe ${groupId}`">
      <MatchCard
        v-for="match in matches"
        :key="match.id"
        :match="match"
        :home-team="resolveTeam(match.homeRef)"
        :away-team="resolveTeam(match.awayRef)"
        :result="store.results[match.id] ?? null"
        static
        @open-score="selectMatch(match)"
      />
    </section>
  </article>
</template>

<style scoped>
.group-table__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.group-table__matches {
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  border-top: 1px solid var(--color-border);
}
</style>
