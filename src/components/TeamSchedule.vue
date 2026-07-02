<script setup lang="ts">
import { ref, computed } from 'vue'
import type { MatchSlot, Team } from '../types/tournament'
import type { TeamMatchEntry } from '../lib/team-schedule'
import { teamRefLabel } from '../lib/bracket-labels'
import { matchStageLabel } from '../lib/team-schedule'
import MatchCard from './MatchCard.vue'
import ScoreDialog from './ScoreDialog.vue'

const props = defineProps<{ entries: TeamMatchEntry[] }>()

interface ScheduleRow {
  entry: TeamMatchEntry
  stageLabel: string
}

// The team's Nth own group match (chronological) is also the Nth group
// matchday, since a team plays exactly once per matchday. Numbering is
// computed chronologically, then the rows are reversed so the most recent
// match is shown first.
const rows = computed((): ScheduleRow[] => {
  const chronological = props.entries.toSorted(
    (a, b) => new Date(a.match.kickoff).getTime() - new Date(b.match.kickoff).getTime(),
  )
  let groupMatchNumber = 0
  const labeled = chronological.map((entry) => {
    if (entry.match.stage === 'group') groupMatchNumber++
    return { entry, stageLabel: matchStageLabel(entry.match.stage, groupMatchNumber) }
  })
  return labeled.toReversed()
})

const selectedMatch = ref<MatchSlot | null>(null)

type DialogTeams = { match: MatchSlot; home: Team; away: Team }

const dialogTeams = computed((): DialogTeams | null => {
  const match = selectedMatch.value
  if (!match) return null
  const entry = props.entries.find((e) => e.match.id === match.id)
  if (!entry?.homeTeam || !entry.awayTeam) return null
  return { match, home: entry.homeTeam, away: entry.awayTeam }
})
</script>

<template>
  <div class="team-schedule">
    <p v-if="rows.length === 0" class="team-schedule__empty">Kein Spielplan verfügbar.</p>
    <div v-for="row in rows" :key="row.entry.match.id" class="team-schedule__entry">
      <p class="team-schedule__stage">{{ row.stageLabel }}</p>
      <MatchCard
        :match="row.entry.match"
        :home-team="row.entry.homeTeam"
        :away-team="row.entry.awayTeam"
        :result="row.entry.result"
        :home-placeholder="teamRefLabel(row.entry.match.homeRef)"
        :away-placeholder="teamRefLabel(row.entry.match.awayRef)"
        hide-link-icon
        @click="selectedMatch = row.entry.match"
      />
    </div>

    <ScoreDialog
      v-if="dialogTeams"
      :match="dialogTeams.match"
      :home-team="dialogTeams.home"
      :away-team="dialogTeams.away"
      @close="selectedMatch = null"
    />
  </div>
</template>

<style scoped>
.team-schedule {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.team-schedule__entry {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.team-schedule__stage {
  margin: 0;
  padding: 0 var(--space-1);
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-muted);
}

.team-schedule__empty {
  margin: 0;
  padding: var(--space-4) 0;
  text-align: center;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
</style>
