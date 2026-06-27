<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { MatchSlot, Team } from '../types/tournament'
import { useTournamentStore } from '../stores/tournament'
import { useAnnounce } from '../composables/use-announce'
import ScoreInput from './ScoreInput.vue'
import DisciplineInput from './DisciplineInput.vue'

const props = defineProps<{
  match: MatchSlot
  homeTeam: Team | null
  awayTeam: Team | null
}>()

const emit = defineEmits<{ close: [] }>()

const store = useTournamentStore()
const announce = useAnnounce()
const dialogEl = ref<HTMLDialogElement | null>(null)

const initial = computed(() => store.results[props.match.id] ?? null)

const homeGoals = ref(initial.value?.homeGoals ?? 0)
const awayGoals = ref(initial.value?.awayGoals ?? 0)
const homeYellow = ref(initial.value?.homeYellow ?? 0)
const homeRed = ref(initial.value?.homeRed ?? 0)
const awayYellow = ref(initial.value?.awayYellow ?? 0)
const awayRed = ref(initial.value?.awayRed ?? 0)
const penaltyWinner = ref<'home' | 'away' | null>(initial.value?.penaltyWinner ?? null)

const isKnockout = computed(() => props.match.stage !== 'group')
const showPenaltyPicker = computed(() => isKnockout.value && homeGoals.value === awayGoals.value)

// Clear penalty winner whenever scores diverge
watch(showPenaltyPicker, (show) => {
  if (!show) penaltyWinner.value = null
})

const title = computed(() => {
  const home = props.homeTeam?.name ?? 'Heim'
  const away = props.awayTeam?.name ?? 'Gast'
  return `Ergebnis: ${home} – ${away}`
})

onMounted(() => {
  dialogEl.value?.showModal()
})

function handleSave(): void {
  store.enterResult({
    matchId: props.match.id,
    homeGoals: homeGoals.value,
    awayGoals: awayGoals.value,
    homeYellow: homeYellow.value,
    homeRed: homeRed.value,
    awayYellow: awayYellow.value,
    awayRed: awayRed.value,
    penaltyWinner: showPenaltyPicker.value ? penaltyWinner.value : null,
  })
  const home = props.homeTeam?.name ?? 'Heim'
  const away = props.awayTeam?.name ?? 'Gast'
  announce(`Ergebnis gespeichert: ${home} ${homeGoals.value} : ${awayGoals.value} ${away}`)
  dialogEl.value?.close()
}

function handleClear(): void {
  store.clearResult(props.match.id)
  announce('Ergebnis gelöscht')
  dialogEl.value?.close()
}
</script>

<template>
  <dialog
    ref="dialogEl"
    class="score-dialog"
    aria-modal="true"
    :aria-label="title"
    @close="emit('close')"
  >
    <div class="score-dialog__inner">
      <header class="score-dialog__header">
        <h2 class="score-dialog__title">{{ title }}</h2>
        <button
          type="button"
          class="score-dialog__close"
          aria-label="Schließen"
          @click="dialogEl?.close()"
        >✕</button>
      </header>

      <div class="score-dialog__body">
        <ScoreInput
          v-model:home="homeGoals"
          v-model:away="awayGoals"
          :home-team="homeTeam"
          :away-team="awayTeam"
        />

        <div
          v-if="showPenaltyPicker"
          class="score-dialog__penalties"
          role="group"
          aria-labelledby="penalty-label"
        >
          <p id="penalty-label" class="score-dialog__penalty-label">
            Elfmeterschießen — Sieger
          </p>
          <div class="score-dialog__penalty-btns">
            <button
              type="button"
              class="score-dialog__penalty-btn"
              :class="{ 'score-dialog__penalty-btn--active': penaltyWinner === 'home' }"
              :aria-pressed="penaltyWinner === 'home'"
              @click="penaltyWinner = penaltyWinner === 'home' ? null : 'home'"
            >{{ homeTeam?.name ?? 'Heim' }}</button>
            <button
              type="button"
              class="score-dialog__penalty-btn"
              :class="{ 'score-dialog__penalty-btn--active': penaltyWinner === 'away' }"
              :aria-pressed="penaltyWinner === 'away'"
              @click="penaltyWinner = penaltyWinner === 'away' ? null : 'away'"
            >{{ awayTeam?.name ?? 'Gast' }}</button>
          </div>
        </div>

        <DisciplineInput
          v-model:home-yellow="homeYellow"
          v-model:home-red="homeRed"
          v-model:away-yellow="awayYellow"
          v-model:away-red="awayRed"
        />
      </div>

      <footer class="score-dialog__footer">
        <button
          v-if="initial"
          type="button"
          class="score-dialog__btn score-dialog__btn--danger"
          @click="handleClear"
        >Löschen</button>
        <div class="score-dialog__footer-actions">
          <button
            type="button"
            class="score-dialog__btn score-dialog__btn--secondary"
            @click="dialogEl?.close()"
          >Abbrechen</button>
          <button
            type="button"
            class="score-dialog__btn score-dialog__btn--primary"
            @click="handleSave"
          >Speichern</button>
        </div>
      </footer>
    </div>
  </dialog>
</template>

<style scoped>
.score-dialog {
  border: none;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text);
  padding: 0;
  max-width: min(90vw, 28rem);
  width: 100%;
  box-shadow: var(--shadow-md);
}

.score-dialog::backdrop {
  background: rgb(0 0 0 / 0.5);
}

.score-dialog__inner {
  display: flex;
  flex-direction: column;
}

.score-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-4) var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.score-dialog__title {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 700;
  line-height: 1.2;
}

.score-dialog__close {
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-lg);
  color: var(--color-text-muted);
  border-radius: var(--radius-sm);
  min-width: var(--tap-target);
  min-height: var(--tap-target);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.score-dialog__close:hover {
  color: var(--color-text);
  background: var(--color-bg);
}

.score-dialog__body {
  padding: var(--space-5) var(--space-4) var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.score-dialog__penalties {
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-3);
}

.score-dialog__penalty-label {
  margin: 0 0 var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  font-weight: 600;
}

.score-dialog__penalty-btns {
  display: flex;
  gap: var(--space-2);
}

.score-dialog__penalty-btn {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  min-height: var(--tap-target);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
  border: 2px solid var(--color-border);
  background: transparent;
  color: var(--color-text);
  font-family: inherit;
  transition: none;
}

.score-dialog__penalty-btn:hover {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
}

.score-dialog__penalty-btn--active {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  color: var(--color-primary);
}

.score-dialog__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4) var(--space-4);
  border-top: 1px solid var(--color-border);
}

.score-dialog__footer-actions {
  display: flex;
  gap: var(--space-2);
  margin-left: auto;
}

.score-dialog__btn {
  padding: var(--space-2) var(--space-4);
  min-height: var(--tap-target);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: 600;
  cursor: pointer;
  border: 2px solid transparent;
}

.score-dialog__btn--primary {
  background: var(--color-primary);
  color: var(--color-primary-contrast);
}

.score-dialog__btn--primary:hover {
  opacity: 0.9;
}

.score-dialog__btn--secondary {
  background: transparent;
  border-color: var(--color-border);
  color: var(--color-text);
}

.score-dialog__btn--secondary:hover {
  background: var(--color-bg);
}

.score-dialog__btn--danger {
  background: transparent;
  border-color: var(--color-loss);
  color: var(--color-loss);
}

.score-dialog__btn--danger:hover {
  background: color-mix(in srgb, var(--color-loss) 10%, transparent);
}
</style>
