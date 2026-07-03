<script setup lang="ts">
import { computed } from 'vue'
import type { TeamMatchEntry } from '../lib/team-schedule'
import { teamRefLabel } from '../lib/bracket-labels'
import { matchStageLabel } from '../lib/team-schedule'
import { useScoreDialog } from '../composables/use-score-dialog'
import MatchCard from './MatchCard.vue'

const props = defineProps<{ entries: TeamMatchEntry[] }>()

const openScoreDialog = useScoreDialog()

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

function selectEntry(entry: TeamMatchEntry): void {
  if (!entry.homeTeam || !entry.awayTeam) return
  openScoreDialog(entry.match, entry.homeTeam, entry.awayTeam)
}
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
        @click="selectEntry(row.entry)"
      />
    </div>
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
