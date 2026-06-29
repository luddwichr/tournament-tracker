<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MatchSlot, Team } from '../types/tournament'
import { knockoutMatches } from '../data/fixtures-2026'
import { useTournamentStore } from '../stores/tournament'
import { resolveTeamRef } from '../lib/knockout'
import { teamRefLabel } from '../lib/bracket-labels'
import { possibleTeamsFor } from '../lib/possible-teams'
import {
  nextMatchMap,
  prevMatchMap,
  teamRefToMatchId,
  matchToRefKeys,
  useBracketConnectors,
} from '../composables/use-bracket-connectors'
import BracketRound, { type MatchRow } from './BracketRound.vue'
import OriginColumn from './OriginColumn.vue'
import PossibleTeamsDialog from './PossibleTeamsDialog.vue'

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

const possibleTeamsMatch = ref<MatchSlot | null>(null)
const possibleTeamsSlot = ref<'home' | 'away' | null>(null)

const ptHomeTeam = computed(() =>
  possibleTeamsMatch.value ? resolveTeamRef(possibleTeamsMatch.value.homeRef, store.results) : null,
)
const ptAwayTeam = computed(() =>
  possibleTeamsMatch.value ? resolveTeamRef(possibleTeamsMatch.value.awayRef, store.results) : null,
)
const possibleHome = computed((): Team[] =>
  possibleTeamsMatch.value && possibleTeamsSlot.value === 'home' && !ptHomeTeam.value
    ? [...possibleTeamsFor(possibleTeamsMatch.value.homeRef, store.results)]
    : [],
)
const possibleAway = computed((): Team[] =>
  possibleTeamsMatch.value && possibleTeamsSlot.value === 'away' && !ptAwayTeam.value
    ? [...possibleTeamsFor(possibleTeamsMatch.value.awayRef, store.results)]
    : [],
)
const homeLabel = computed(() =>
  possibleTeamsMatch.value ? (ptHomeTeam.value?.name ?? teamRefLabel(possibleTeamsMatch.value.homeRef)) : '',
)
const awayLabel = computed(() =>
  possibleTeamsMatch.value ? (ptAwayTeam.value?.name ?? teamRefLabel(possibleTeamsMatch.value.awayRef)) : '',
)

function openPossibleTeams(match: MatchSlot, slot: 'home' | 'away'): void {
  possibleTeamsMatch.value = match
  possibleTeamsSlot.value = slot
}

function closePossibleTeams(): void {
  possibleTeamsMatch.value = null
  possibleTeamsSlot.value = null
}

const bracketViewEl = ref<HTMLElement | null>(null)
const roundsEl = ref<HTMLElement | null>(null)
const hoveredMatchId = ref<string | null>(null)
const hoveredRefKey = ref<string | null>(null)
const connectorPaths = ref<string[]>([])

const { matchConnector, originConnector } = useBracketConnectors(roundsEl, bracketViewEl)

const highlightedMatchIds = computed((): string[] => {
  const ids: string[] = []
  if (hoveredMatchId.value) {
    const target = nextMatchMap.get(hoveredMatchId.value)
    if (target) ids.push(target)
    ids.push(...(prevMatchMap.get(hoveredMatchId.value) ?? []))
  }
  if (hoveredRefKey.value) {
    const matchId = teamRefToMatchId.get(hoveredRefKey.value)
    if (matchId) ids.push(matchId)
  }
  return ids
})

const highlightedRefKeys = computed((): string[] => {
  const keys: string[] = []
  if (hoveredMatchId.value) {
    keys.push(...(matchToRefKeys.get(hoveredMatchId.value) ?? []))
  }
  if (hoveredRefKey.value) {
    keys.push(hoveredRefKey.value)
  }
  return keys
})

function buildAllPaths(matchId: string): string[] {
  const paths: string[] = []
  const targetId = nextMatchMap.get(matchId)
  if (targetId) {
    const p = matchConnector(matchId, targetId)
    if (p) paths.push(p)
  }
  for (const prevId of prevMatchMap.get(matchId) ?? []) {
    const p = matchConnector(prevId, matchId)
    if (p) paths.push(p)
  }
  for (const refKey of matchToRefKeys.get(matchId) ?? []) {
    const p = originConnector(refKey, matchId)
    if (p) paths.push(p)
  }
  return paths
}

function onMatchHover(matchId: string) {
  hoveredMatchId.value = matchId
  hoveredRefKey.value = null
  connectorPaths.value = buildAllPaths(matchId)
}

function onMatchHoverEnd() {
  hoveredMatchId.value = null
  hoveredRefKey.value = null
  connectorPaths.value = []
}

function onTeamRefHover(refKey: string) {
  hoveredRefKey.value = refKey
  hoveredMatchId.value = null
  const matchId = teamRefToMatchId.get(refKey)
  if (matchId) {
    const p = originConnector(refKey, matchId)
    connectorPaths.value = p ? [p] : []
  } else {
    connectorPaths.value = []
  }
}

function onTeamRefHoverEnd() {
  hoveredRefKey.value = null
  hoveredMatchId.value = null
  connectorPaths.value = []
}
</script>

<template>
  <div
    ref="bracketViewEl"
    class="bracket-view"
    role="region"
    aria-label="K.-o.-Runde"
    tabindex="0"
  >
    <div
      ref="roundsEl"
      class="bracket-view__rounds"
    >
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
        @match-click="emit('matchClick', $event)"
        @match-hover="onMatchHover"
        @match-hover-end="onMatchHoverEnd"
        @placeholder-click="openPossibleTeams"
      />
      <svg
        class="bracket-view__connectors"
        aria-hidden="true"
      >
        <path
          v-for="(path, i) in connectorPaths"
          :key="i"
          :d="path"
          class="bracket-view__connector"
        />
      </svg>
    </div>
  </div>

  <Teleport to="body">
    <PossibleTeamsDialog
      v-if="possibleTeamsMatch"
      :home-label="homeLabel"
      :away-label="awayLabel"
      :possible-home="possibleHome"
      :possible-away="possibleAway"
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
