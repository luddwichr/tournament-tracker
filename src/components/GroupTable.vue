<script setup lang="ts">
import { ref, computed } from 'vue'
import type { GroupId, MatchSlot, Team } from '../types/tournament'
import { teamsById } from '../data/teams'
import { groupMatches } from '../data/fixtures-2026'
import { useTournamentStore } from '../stores/tournament'
import { computeGroupStandings } from '../lib/standings'
import MatchCard from './MatchCard.vue'
import ScoreDialog from './ScoreDialog.vue'
import GroupStandingsTable from './GroupStandingsTable.vue'

const props = defineProps<{ groupId: GroupId }>()

const store = useTournamentStore()

const matches = groupMatches.filter((m) => m.group === props.groupId)

const standings = computed(() => computeGroupStandings(props.groupId, store.results))
const groupDone = computed(() => standings.value.every((s) => s.played === 3))

const selectedMatch = ref<MatchSlot | null>(null)

function resolveTeam(teamRef: MatchSlot['homeRef']): Team | null {
  if (teamRef.kind === 'team') return teamsById.get(teamRef.teamId) ?? null
  return null
}

const selectedHome = computed(() => (selectedMatch.value ? resolveTeam(selectedMatch.value.homeRef) : null))
const selectedAway = computed(() => (selectedMatch.value ? resolveTeam(selectedMatch.value.awayRef) : null))
</script>

<template>
  <article class="group-table surface-card" :aria-label="`Gruppe ${groupId}`">
    <header class="group-table__header">
      <h2 class="group-table__title">Gruppe {{ groupId }}</h2>
    </header>

    <GroupStandingsTable :standings="standings" :group-done="groupDone" />

    <section class="group-table__matches" aria-label="Spiele">
      <MatchCard
        v-for="match in matches"
        :key="match.id"
        :match="match"
        :home-team="resolveTeam(match.homeRef)"
        :away-team="resolveTeam(match.awayRef)"
        :result="store.results[match.id] ?? null"
        @click="selectedMatch = match"
      />
    </section>

    <ScoreDialog
      v-if="selectedMatch && selectedHome && selectedAway"
      :match="selectedMatch"
      :home-team="selectedHome"
      :away-team="selectedAway"
      @close="selectedMatch = null"
    />
  </article>
</template>

<style scoped>
.group-table__header {
  padding: var(--space-3) var(--space-4);
  background-color: var(--color-primary);
  color: var(--color-primary-contrast);
}

.group-table__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 700;
}

.group-table__matches {
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  border-top: 1px solid var(--color-border);
}
</style>
