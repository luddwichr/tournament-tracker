<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import type { MatchSlot } from '../types/tournament'
import { knockoutMatches } from '../data/fixtures-2026'
import { useTournamentStore } from '../stores/tournament'
import { resolveTeamRef } from '../lib/knockout'
import { teamRefLabel } from '../lib/bracket-labels'
import BracketRound, { type MatchRow } from './BracketRound.vue'
import OriginColumn from './OriginColumn.vue'
import PossibleTeamsDialog from './PossibleTeamsDialog.vue'
import { usePossibleTeamsDialog } from '../composables/use-possible-teams-dialog'
import { useBracketHighlight } from '../composables/use-bracket-highlight'

const emit = defineEmits<{ matchClick: [match: MatchSlot] }>()

const store = useTournamentStore()

function toRow(match: MatchSlot, sectionLabel?: string): MatchRow {
  const base = {
    match,
    homeTeam: resolveTeamRef(match.homeRef, store.results),
    awayTeam: resolveTeamRef(match.awayRef, store.results),
    result: store.results[match.id] ?? null,
    homePlaceholder: teamRefLabel(match.homeRef),
    awayPlaceholder: teamRefLabel(match.awayRef),
  }
  return sectionLabel !== undefined ? { ...base, sectionLabel } : base
}

interface Round {
  title: string
  matches: MatchRow[]
}

const rounds = computed((): Round[] => {
  const stageRounds: { title: string; stage: string }[] = [
    { title: 'Runde der 32', stage: 'r32' },
    { title: 'Achtelfinale', stage: 'r16' },
    { title: 'Viertelfinale', stage: 'qf' },
    { title: 'Halbfinale', stage: 'sf' },
  ]

  const groups: Round[] = stageRounds.map(({ title, stage }) => ({
    title,
    matches: knockoutMatches
      .filter((m) => m.stage === stage)
      .toSorted((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
      .map((m) => toRow(m)),
  }))

  const thirdMatch = knockoutMatches.find((m) => m.stage === 'third')!
  const finalMatch = knockoutMatches.find((m) => m.stage === 'final')!

  groups.push({
    title: 'Finale',
    matches: [toRow(thirdMatch, 'Spiel um Platz 3'), toRow(finalMatch, 'Finale')],
  })

  return groups
})

const {
  possibleTeamsMatch,
  possibleTeams,
  label: possibleTeamsLabel,
  open: openPossibleTeams,
  close: closePossibleTeams,
} = usePossibleTeamsDialog()

const bracketViewEl = useTemplateRef<HTMLElement>('bracketViewEl')
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
} = useBracketHighlight(roundsEl, bracketViewEl)
</script>

<template>
  <div ref="bracketViewEl" class="bracket-view" role="region" aria-label="K.-o.-Runde" tabindex="0">
    <div ref="roundsEl" class="bracket-view__rounds">
      <OriginColumn
        :highlighted-refs="highlightedRefKeys"
        @team-ref-hover="onTeamRefHover"
        @team-ref-hover-end="onTeamRefHoverEnd"
      />
      <BracketRound
        v-for="round in rounds"
        :key="round.title"
        :title="round.title"
        :matches="round.matches"
        :highlighted-match-ids="highlightedMatchIds"
        :pinned-match-id="pinnedMatchId"
        @match-click="emit('matchClick', $event)"
        @match-hover="onMatchHover"
        @match-hover-end="onMatchHoverEnd"
        @toggle-highlight="toggleMatchPin"
        @placeholder-click="openPossibleTeams"
      />
      <svg class="bracket-view__connectors" aria-hidden="true">
        <path v-for="(path, i) in connectorPaths" :key="i" :d="path" class="bracket-view__connector" />
      </svg>
    </div>
  </div>

  <Teleport to="body">
    <PossibleTeamsDialog
      v-if="possibleTeamsMatch"
      :label="possibleTeamsLabel"
      :possible-teams="possibleTeams"
      @close="closePossibleTeams"
    />
  </Teleport>
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

.bracket-view__connectors {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
}

.bracket-view__connector {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 2.5;
  stroke-opacity: 0.65;
  stroke-linecap: round;
}
</style>
