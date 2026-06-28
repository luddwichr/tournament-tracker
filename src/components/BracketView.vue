<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MatchSlot, TeamRef } from '../types/tournament'
import { knockoutMatches } from '../data/fixtures-2026'
import { useTournamentStore } from '../stores/tournament'
import { resolveTeamRef } from '../lib/knockout'
import { teamRefLabel } from '../lib/bracket-labels'
import BracketRound, { type MatchRow } from './BracketRound.vue'
import OriginColumn from './OriginColumn.vue'

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

// Backward map: matchId → previous-round KO matches that feed into it.
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

function r32RefKey(ref: TeamRef): string | null {
  if (ref.kind === 'groupRank') return `groupRank:${ref.group}:${ref.rank}`
  if (ref.kind === 'thirdPlace') return `thirdPlace:${ref.slot}`
  return null
}

// Map from origin ref key → R32 match id.
const teamRefToMatchId = computed(() => {
  const map = new Map<string, string>()
  for (const match of knockoutMatches.filter((m) => m.stage === 'r32')) {
    const hk = r32RefKey(match.homeRef)
    const ak = r32RefKey(match.awayRef)
    if (hk) map.set(hk, match.id)
    if (ak) map.set(ak, match.id)
  }
  return map
})

// Reverse map: R32 match id → origin ref keys that feed into it.
const matchToRefKeys = computed(() => {
  const map = new Map<string, string[]>()
  for (const [refKey, matchId] of teamRefToMatchId.value) {
    const keys = map.get(matchId) ?? []
    keys.push(refKey)
    map.set(matchId, keys)
  }
  return map
})

const bracketViewEl = ref<HTMLElement | null>(null)
const roundsEl = ref<HTMLElement | null>(null)
const hoveredMatchId = ref<string | null>(null)
const hoveredRefKey = ref<string | null>(null)
const connectorPaths = ref<string[]>([])

// Matches highlighted via bracket hover (next + previous KO round).
const highlightedMatchIds = computed((): string[] => {
  const ids: string[] = []
  if (hoveredMatchId.value) {
    const target = nextMatchMap.value.get(hoveredMatchId.value)
    if (target) ids.push(target)
    ids.push(...(prevMatchMap.value.get(hoveredMatchId.value) ?? []))
  }
  if (hoveredRefKey.value) {
    const matchId = teamRefToMatchId.value.get(hoveredRefKey.value)
    if (matchId) ids.push(matchId)
  }
  return ids
})

// Origin ref keys highlighted (from hovering an R32 match or an origin row).
const highlightedRefKeys = computed((): string[] => {
  const keys: string[] = []
  if (hoveredMatchId.value) {
    keys.push(...(matchToRefKeys.value.get(hoveredMatchId.value) ?? []))
  }
  if (hoveredRefKey.value) {
    keys.push(hoveredRefKey.value)
  }
  return keys
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

function makeOriginPath(refKey: string, matchId: string): string | null {
  if (!roundsEl.value || !bracketViewEl.value) return null
  const rounds = roundsEl.value
  const cRect = rounds.getBoundingClientRect()
  const sl = bracketViewEl.value.scrollLeft
  const st = bracketViewEl.value.scrollTop

  const fromEl = rounds.querySelector<HTMLElement>(`[data-ref-key="${refKey}"]`)
  const toGroup = rounds.querySelector<HTMLElement>(`[data-match-id="${matchId}"]`)
  if (!fromEl || !toGroup) return null

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
  // backward KO: previous-round sources → hovered
  for (const prevId of prevMatchMap.value.get(matchId) ?? []) {
    const p = makePath(prevId, matchId)
    if (p) paths.push(p)
  }
  // backward origin: group-stage refs → this R32 match
  for (const refKey of matchToRefKeys.value.get(matchId) ?? []) {
    const p = makeOriginPath(refKey, matchId)
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
  const matchId = teamRefToMatchId.value.get(refKey)
  if (matchId) {
    const p = makeOriginPath(refKey, matchId)
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
