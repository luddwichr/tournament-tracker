<script setup lang="ts">
import { type BracketColumnStage, currentBracketColumn, resolveTeamRef } from '../lib/knockout'
import BracketRound, { type MatchRow } from './BracketRound.vue'
import { computed, onMounted, useTemplateRef } from 'vue'
import BracketConnectors from './BracketConnectors.vue'
import type { MatchSlot } from '../types/tournament'
import OriginColumn from './OriginColumn.vue'
import PossibleTeamsDialog from './PossibleTeamsDialog.vue'
import { knockoutMatches } from '../data/fixtures-2026'
import { teamRefLabel } from '../lib/bracket-labels'
import { useBracketHighlight } from '../composables/use-bracket-highlight'
import { useOriginGroupData } from '../composables/use-origin-group-data'
import { usePossibleTeamsDialog } from '../composables/use-possible-teams-dialog'
import { useScoreDialog } from '../composables/use-score-dialog'
import { useTournamentStore } from '../stores/tournament'

const store = useTournamentStore()
const openScoreDialog = useScoreDialog()

// The row already carries both teams resolved by `toRow`, so opening the
// dialog needs no second `resolveTeamRef` pass. A slot only stays null while
// its feeder match is unplayed — the dialog can't open on those.
function selectMatch(row: MatchRow): void {
  if (row.homeTeam && row.awayTeam) openScoreDialog(row.match, row.homeTeam, row.awayTeam)
}

function toRow(match: MatchSlot, sectionLabel?: string): MatchRow {
  const base = {
    awayPlaceholder: teamRefLabel(match.awayRef),
    awayTeam: resolveTeamRef(match.awayRef, store.results),
    homePlaceholder: teamRefLabel(match.homeRef),
    homeTeam: resolveTeamRef(match.homeRef, store.results),
    match,
    result: store.results[match.id] ?? null,
  }
  return sectionLabel !== undefined ? { ...base, sectionLabel } : base
}

const groupData = useOriginGroupData()

const stageRounds = [
  { stage: 'r32', title: 'Runde der 32' },
  { stage: 'r16', title: 'Achtelfinale' },
  { stage: 'qf', title: 'Viertelfinale' },
  { stage: 'sf', title: 'Halbfinale' },
] as const

interface Round {
  title: string
  stage: BracketColumnStage
  matches: MatchRow[]
}

const rounds = computed((): Round[] => {
  const groups: Round[] = stageRounds.map(({ title, stage }) => ({
    matches: knockoutMatches
      .filter((m) => m.stage === stage)
      .toSorted((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
      .map((m) => toRow(m)),
    stage,
    title,
  }))

  // The static fixtures define exactly one match per final stage
  // (asserted in data.spec.ts); fail loudly if that ever changes.
  const thirdMatch = knockoutMatches.find((m) => m.stage === 'third')
  const finalMatch = knockoutMatches.find((m) => m.stage === 'final')
  if (!thirdMatch || !finalMatch) {
    throw new Error('fixtures are missing the third-place or final match')
  }
  groups.push({
    matches: [toRow(thirdMatch, 'Spiel um Platz 3'), toRow(finalMatch, 'Finale')],
    stage: 'final',
    title: 'Finale',
  })

  return groups
})

const {
  isOpen: possibleTeamsOpen,
  teams: possibleTeams,
  label: possibleTeamsLabel,
  open: openPossibleTeams,
  close: closePossibleTeams,
} = usePossibleTeamsDialog()

const roundsEl = useTemplateRef<HTMLElement>('roundsEl')

const {
  connectorPaths,
  highlightedMatchIds,
  highlightedRefKeys,
  pinnedMatchId,
  onMatchHover,
  onMatchHoverEnd,
  onTeamRefHover,
  onTeamRefHoverEnd,
  toggleMatchPin,
} = useBracketHighlight(roundsEl)

onMounted(() => {
  const stage = currentBracketColumn(store.results)
  if (!stage) return
  roundsEl.value
    ?.querySelector<HTMLElement>(`[data-stage="${stage}"]`)
    ?.scrollIntoView({ block: 'nearest', inline: 'start' })
})
</script>

<template>
  <div class="bracket-view" role="region" aria-label="K.-o.-Runde" tabindex="0">
    <div ref="roundsEl" class="bracket-view__rounds">
      <OriginColumn
        :group-data="groupData"
        :highlighted-refs="highlightedRefKeys"
        @team-ref-hover="onTeamRefHover"
        @team-ref-hover-end="onTeamRefHoverEnd"
      />
      <BracketRound
        v-for="round in rounds"
        :key="round.stage"
        :title="round.title"
        :stage="round.stage"
        :matches="round.matches"
        :highlighted-match-ids="highlightedMatchIds"
        :pinned-match-id="pinnedMatchId"
        @match-click="selectMatch"
        @match-hover="onMatchHover"
        @match-hover-end="onMatchHoverEnd"
        @toggle-highlight="toggleMatchPin"
        @placeholder-click="openPossibleTeams"
      />
      <BracketConnectors :paths="connectorPaths" />
    </div>
  </div>

  <PossibleTeamsDialog
    v-if="possibleTeamsOpen"
    :label="possibleTeamsLabel"
    :possible-teams="possibleTeams"
    @close="closePossibleTeams"
  />
</template>

<style scoped>
.bracket-view {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: var(--space-4);
}

.bracket-view__rounds {
  position: relative;
  display: flex;
  gap: var(--space-5);
  align-items: flex-start;
  min-width: max-content;
  padding: var(--space-1) var(--space-1) var(--space-2);
}
</style>
