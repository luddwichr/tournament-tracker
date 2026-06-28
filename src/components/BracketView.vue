<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MatchSlot } from '../types/tournament'
import { knockoutMatches } from '../data/fixtures-2026'
import { useTournamentStore } from '../stores/tournament'
import { resolveTeamRef } from '../lib/knockout'
import { teamRefLabel } from '../lib/bracket-labels'
import BracketRound, { type MatchRow } from './BracketRound.vue'

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
  const r = store.results
  void r // ensure reactivity

  const stageRounds: { title: string; stage: string }[] = [
    { title: 'Runde der 32', stage: 'r32' },
    { title: 'Achtelfinale', stage: 'r16' },
    { title: 'Viertelfinale', stage: 'qf' },
    { title: 'Halbfinale', stage: 'sf' },
  ]

  const groups: Round[] = stageRounds.map(({ title, stage }) => ({
    title,
    matches: knockoutMatches.filter((m) => m.stage === stage).map((m) => toRow(m)),
  }))

  const thirdMatch = knockoutMatches.find((m) => m.stage === 'third')!
  const finalMatch = knockoutMatches.find((m) => m.stage === 'final')!

  groups.push({
    title: 'Finale',
    matches: [toRow(thirdMatch, 'Spiel um Platz 3'), toRow(finalMatch, 'Finale')],
  })

  return groups
})

// Forward map: matchId → next-round match its winner feeds into.
const nextMatchMap = computed(() => {
  const map = new Map<string, string>()
  for (const match of knockoutMatches) {
    if (match.homeRef.kind === 'matchWinner') map.set(match.homeRef.matchId, match.id)
    if (match.awayRef.kind === 'matchWinner') map.set(match.awayRef.matchId, match.id)
  }
  return map
})

// Backward map: matchId → previous-round matches that feed into it.
const prevMatchMap = computed(() => {
  const map = new Map<string, string[]>()
  for (const match of knockoutMatches) {
    const sources: string[] = []
    if (match.homeRef.kind === 'matchWinner') sources.push(match.homeRef.matchId)
    if (match.awayRef.kind === 'matchWinner') sources.push(match.awayRef.matchId)
    if (sources.length > 0) map.set(match.id, sources)
  }
  return map
})

const bracketViewEl = ref<HTMLElement | null>(null)
const roundsEl = ref<HTMLElement | null>(null)
const hoveredMatchId = ref<string | null>(null)
const connectorPaths = ref<string[]>([])

// IDs of all matches connected to the hovered one (sources + target).
const highlightedMatchIds = computed((): string[] => {
  if (!hoveredMatchId.value) return []
  const ids: string[] = []
  const target = nextMatchMap.value.get(hoveredMatchId.value)
  if (target) ids.push(target)
  ids.push(...(prevMatchMap.value.get(hoveredMatchId.value) ?? []))
  return ids
})

function makePath(fromId: string, toId: string): string | null {
  if (!roundsEl.value || !bracketViewEl.value) return null
  const rounds = roundsEl.value
  const cRect = rounds.getBoundingClientRect()
  const sl = bracketViewEl.value.scrollLeft
  const st = bracketViewEl.value.scrollTop

  const fromGroup = rounds.querySelector<HTMLElement>(`[data-match-id="${fromId}"]`)
  const toGroup = rounds.querySelector<HTMLElement>(`[data-match-id="${toId}"]`)
  if (!fromGroup || !toGroup) return null

  const fromEl = fromGroup.querySelector<HTMLElement>('.match-card') ?? fromGroup
  const toEl = toGroup.querySelector<HTMLElement>('.match-card') ?? toGroup

  const sR = fromEl.getBoundingClientRect()
  const tR = toEl.getBoundingClientRect()

  const x1 = sR.right - cRect.left + sl
  const y1 = sR.top + sR.height / 2 - cRect.top + st
  const x2 = tR.left - cRect.left + sl
  const y2 = tR.top + tR.height / 2 - cRect.top + st
  const cx = (x1 + x2) / 2

  return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`
}

function buildAllPaths(matchId: string): string[] {
  const paths: string[] = []
  // forward: hovered → next round
  const targetId = nextMatchMap.value.get(matchId)
  if (targetId) {
    const p = makePath(matchId, targetId)
    if (p) paths.push(p)
  }
  // backward: previous-round sources → hovered
  for (const prevId of prevMatchMap.value.get(matchId) ?? []) {
    const p = makePath(prevId, matchId)
    if (p) paths.push(p)
  }
  return paths
}

function onMatchHover(matchId: string) {
  hoveredMatchId.value = matchId
  connectorPaths.value = buildAllPaths(matchId)
}

function onMatchHoverEnd() {
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
    <div ref="roundsEl" class="bracket-view__rounds">
      <BracketRound
        v-for="round in rounds"
        :key="round.title"
        :title="round.title"
        :matches="round.matches"
        :highlighted-match-ids="highlightedMatchIds"
        @match-click="emit('matchClick', $event)"
        @match-hover="onMatchHover"
        @match-hover-end="onMatchHoverEnd"
      />
      <svg class="bracket-view__connectors" aria-hidden="true">
        <path
          v-for="(path, i) in connectorPaths"
          :key="i"
          :d="path"
          class="bracket-view__connector"
        />
      </svg>
    </div>
  </div>
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
