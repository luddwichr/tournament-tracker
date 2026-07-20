<script setup lang="ts">
import type { MatchSlot, Team } from '../types/tournament'
import { computed, ref, useTemplateRef } from 'vue'
import BaseDialog from './BaseDialog.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import DisciplineInput from './DisciplineInput.vue'
import ScoreInput from './ScoreInput.vue'
import TeamFlag from './TeamFlag.vue'
import { useMatchResultForm } from '../composables/use-match-result-form'

const { match, homeTeam, awayTeam } = defineProps<{
  match: MatchSlot
  homeTeam: Team
  awayTeam: Team
}>()

const emit = defineEmits<{ close: [] }>()

const baseDialog = useTemplateRef<InstanceType<typeof BaseDialog>>('baseDialog')
const close = () => baseDialog.value?.close()

const {
  goals,
  cards,
  shootout,
  shootoutRequired,
  saveError,
  title,
  initial,
  save,
  clear,
  pendingAction,
  pendingMessage,
  confirmPending,
  cancelPending,
  fetch,
} = useMatchResultForm(
  () => match,
  () => homeTeam,
  () => awayTeam,
)

// The error only appears once a save was attempted, but then tracks the
// inputs live until the form is saveable again.
const attemptedSave = ref(false)
const shownError = computed(() => (attemptedSave.value ? saveError.value : null))

function onSave(): void {
  if (saveError.value) {
    attemptedSave.value = true
    return
  }
  if (save()) close()
}

function onClear(): void {
  if (clear()) close()
}

function onConfirmPending(): void {
  if (confirmPending()) close()
}

const isPastKickoff = computed(() => new Date(match.kickoff).getTime() <= Date.now())
</script>

<template>
  <BaseDialog ref="baseDialog" :title="title" max-width="var(--dialog-width-lg)" @close="emit('close')">
    <div class="score-dialog__body">
      <!-- aria-hidden: the steppers below already name their team in every
           label, so announcing the heading row again would just be noise. It
           exists for the sighted non-reader, who navigates by flag. -->
      <div class="score-dialog__teams" aria-hidden="true">
        <p class="score-dialog__team">
          <TeamFlag :flag-code="homeTeam.flagCode" size="2.5rem" />
          <span class="score-dialog__team-name">{{ homeTeam.name }}</span>
        </p>
        <p class="score-dialog__team">
          <TeamFlag :flag-code="awayTeam.flagCode" size="2.5rem" />
          <span class="score-dialog__team-name">{{ awayTeam.name }}</span>
        </p>
      </div>

      <ScoreInput v-model:home="goals.home" v-model:away="goals.away" :home-team="homeTeam" :away-team="awayTeam" />

      <!-- A knockout match can't end level, so a level score means "goes to
           a shootout" — the shootout steppers appear exactly then. -->
      <ScoreInput
        v-if="shootoutRequired"
        v-model:home="shootout.home"
        v-model:away="shootout.away"
        :home-team="homeTeam"
        :away-team="awayTeam"
        legend="Elfmeterschießen"
        goal-noun="Elfmetertor"
        emoji="🎯"
      />

      <p v-if="shownError" class="score-dialog__draw-error" role="alert">
        {{ shownError }}
      </p>

      <DisciplineInput
        v-model:home-yellow="cards.homeYellow"
        v-model:home-red="cards.homeRed"
        v-model:away-yellow="cards.awayYellow"
        v-model:away-red="cards.awayRed"
        :home-team="homeTeam"
        :away-team="awayTeam"
      />

      <template v-if="isPastKickoff">
        <button
          type="button"
          class="btn btn--secondary score-dialog__fetch"
          :disabled="fetch.status === 'loading'"
          @click="fetch.run"
        >
          <span class="score-dialog__btn-symbol" aria-hidden="true">🔄</span>
          {{ fetch.status === 'loading' ? 'Ergebnis wird geholt …' : 'Ergebnis holen' }}
        </button>

        <p class="score-dialog__fetch-message" role="status">{{ fetch.message }}</p>
        <p
          v-if="fetch.status === 'error'"
          class="score-dialog__fetch-message score-dialog__fetch-message--error"
          role="alert"
        >
          {{ fetch.error }}
        </p>
      </template>
    </div>

    <template #footer>
      <button v-if="initial" type="button" class="btn btn--danger score-dialog__delete" @click="onClear">
        <span class="score-dialog__btn-symbol" aria-hidden="true">🗑</span> Löschen
      </button>
      <div class="score-dialog__footer-actions">
        <button type="button" class="btn btn--secondary" @click="close">
          <span class="score-dialog__btn-symbol" aria-hidden="true">✕</span> Abbrechen
        </button>
        <button type="button" class="btn btn--primary" @click="onSave">
          <span class="score-dialog__btn-symbol" aria-hidden="true">✓</span> Speichern
        </button>
      </div>
    </template>
  </BaseDialog>

  <ConfirmDialog
    v-if="pendingAction"
    title="Spätere Spiele betroffen"
    :message="pendingMessage"
    :confirm-label="pendingAction.kind === 'save' ? 'Trotzdem speichern' : 'Trotzdem löschen'"
    @confirm="onConfirmPending"
    @cancel="cancelPending"
  />
</template>

<style scoped>
.score-dialog__body {
  padding: var(--space-5) var(--space-4) var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.score-dialog__teams {
  display: flex;
  justify-content: space-between;
  padding: 0 var(--space-1);
}

.score-dialog__team {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  margin: 0;
  min-width: 0;
}

/* Full text color, not muted: this is the label a child matches against the
   flag to know which stepper is whose. */
.score-dialog__team-name {
  max-width: 100%;
  text-align: center;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.score-dialog__draw-error {
  margin: 0;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  background: color-mix(in srgb, var(--color-draw) 12%, transparent);
  color: var(--color-draw);
  border: 2px solid var(--color-draw);
}

.score-dialog__btn-symbol {
  margin-inline-end: 0.3em;
}

.score-dialog__fetch {
  align-self: center;
}

.score-dialog__fetch-message {
  margin: calc(-1 * var(--space-2)) 0 0;
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.score-dialog__fetch-message--error {
  color: var(--color-loss);
}

.score-dialog__footer-actions {
  display: flex;
  gap: var(--space-2);
}
</style>
