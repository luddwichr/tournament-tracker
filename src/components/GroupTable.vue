<script setup lang="ts">
import { ref, computed } from 'vue'
import type { GroupId, MatchSlot, Team } from '../types/tournament'
import { teamsById } from '../data/teams'
import { groupMatches } from '../data/fixtures-2026'
import { useTournamentStore } from '../stores/tournament'
import { computeGroupStandings } from '../lib/standings'
import MatchCard from './MatchCard.vue'
import StandingsRow from './StandingsRow.vue'
import ScoreDialog from './ScoreDialog.vue'

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
</script>

<template>
  <article
    class="group-table surface-card"
    :aria-label="`Gruppe ${groupId}`"
  >
    <header class="group-table__header">
      <h2 class="group-table__title">
        Gruppe {{ groupId }}
      </h2>
    </header>

    <div
      class="group-table__standings"
      tabindex="0"
    >
      <table class="standings-table">
        <caption class="visually-hidden">
          Gruppe {{ groupId }} – Tabelle
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              class="standings-table__team-col"
            >
              Team
            </th>
            <th
              scope="col"
              class="standings-table__num-col"
              title="Spiele"
            >
              Sp
            </th>
            <th
              scope="col"
              class="standings-table__num-col"
              title="Siege"
            >
              S
            </th>
            <th
              scope="col"
              class="standings-table__num-col"
              title="Unentschieden"
            >
              U
            </th>
            <th
              scope="col"
              class="standings-table__num-col"
              title="Niederlagen"
            >
              N
            </th>
            <th
              scope="col"
              class="standings-table__num-col"
              title="Tore"
            >
              T+
            </th>
            <th
              scope="col"
              class="standings-table__num-col"
              title="Gegentore"
            >
              T-
            </th>
            <th
              scope="col"
              class="standings-table__num-col"
              title="Tordifferenz"
            >
              TD
            </th>
            <th
              scope="col"
              class="standings-table__num-col"
              title="Punkte"
            >
              Pkt
            </th>
          </tr>
        </thead>
        <tbody>
          <StandingsRow
            v-for="(stat, idx) in standings"
            :key="stat.team.id"
            :stat="stat"
            :rank="idx + 1"
            :group-done="groupDone"
          />
        </tbody>
      </table>
    </div>

    <div class="group-table__matches">
      <MatchCard
        v-for="match in matches"
        :key="match.id"
        :match="match"
        :home-team="resolveTeam(match.homeRef)"
        :away-team="resolveTeam(match.awayRef)"
        :result="store.results[match.id] ?? null"
        @click="selectedMatch = match"
      />
    </div>

    <ScoreDialog
      v-if="selectedMatch"
      :match="selectedMatch"
      :home-team="resolveTeam(selectedMatch.homeRef)"
      :away-team="resolveTeam(selectedMatch.awayRef)"
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

.group-table__standings {
  overflow-x: auto;
}

.standings-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.standings-table thead tr {
  background-color: color-mix(in srgb, var(--color-primary) 8%, transparent);
}

.standings-table th {
  padding: var(--space-1) var(--space-1);
  text-align: center;
  font-weight: 600;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.standings-table thead .standings-table__team-col {
  text-align: left;
  padding-left: var(--space-3);
}

.standings-table__num-col {
  min-width: 1.25rem;
}

.group-table__matches {
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  border-top: 1px solid var(--color-border);
}
</style>
