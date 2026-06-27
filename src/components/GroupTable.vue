<script setup lang="ts">
import type { GroupId } from '../types/tournament'
import { teamsById, teamsInGroup } from '../data/teams'
import { groupMatches } from '../data/fixtures-2026'
import TeamLabel from './TeamLabel.vue'
import MatchCard from './MatchCard.vue'

const props = defineProps<{
  groupId: GroupId
}>()

const teams = teamsInGroup(props.groupId).toSorted((a, b) =>
  a.name.localeCompare(b.name, 'de'),
)

const matches = groupMatches.filter((m) => m.group === props.groupId)

function resolveTeam(ref: (typeof matches)[0]['homeRef']) {
  if (ref.kind === 'team') return teamsById.get(ref.teamId) ?? null
  return null
}
</script>

<template>
  <article class="group-table" :aria-label="`Gruppe ${groupId}`">
    <header class="group-table__header">
      <h2 class="group-table__title">Gruppe {{ groupId }}</h2>
    </header>

    <section class="group-table__teams" aria-label="Teams">
      <ul class="group-table__team-list">
        <li v-for="team in teams" :key="team.id" class="group-table__team-item">
          <TeamLabel :team="team" flag-size="2rem" />
        </li>
      </ul>
    </section>

    <section class="group-table__matches" aria-label="Spiele">
      <MatchCard
        v-for="match in matches"
        :key="match.id"
        :match="match"
        :home-team="resolveTeam(match.homeRef)"
        :away-team="resolveTeam(match.awayRef)"
      />
    </section>
  </article>
</template>

<style scoped>
.group-table {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

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

.group-table__teams {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.group-table__team-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.group-table__team-item {
  display: flex;
  align-items: center;
}

.group-table__matches {
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
