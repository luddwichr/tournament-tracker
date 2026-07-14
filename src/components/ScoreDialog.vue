<script setup lang="ts">
import type { MatchSlot, Team } from '../types/tournament'
import { computed, ref, useTemplateRef } from 'vue'
import BaseDialog from './BaseDialog.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import DisciplineInput from './DisciplineInput.vue'
import ScoreInput from './ScoreInput.vue'
import { useMatchResultForm } from '../composables/use-match-result-form'

const props = defineProps<{
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
  knockoutDraw,
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
  () => props.match,
  () => props.homeTeam,
  () => props.awayTeam,
)

const attemptedDrawSave = ref(false)
const showDrawError = computed(() => attemptedDrawSave.value && knockoutDraw.value)

const isPastKickoff = new Date(props.match.kickoff).getTime() <= Date.now()
</script>

<template>
  <BaseDialog ref="baseDialog" :title="title" max-width="var(--dialog-width-lg)" @close="emit('close')">
    <div class="score-dialog__body">
      <div class="score-dialog__teams" aria-hidden="true">
        <span class="score-dialog__team-name">{{ homeTeam.name }}</span>
        <span class="score-dialog__team-name">{{ awayTeam.name }}</span>
      </div>

      <ScoreInput v-model:home="goals.home" v-model:away="goals.away" :home-team="homeTeam" :away-team="awayTeam" />

      <p v-if="showDrawError" class="score-dialog__draw-error" role="alert">
        Unentschieden geht nicht! Wer hat gewonnen?
      </p>

      <DisciplineInput
        v-model:home-yellow="cards.homeYellow"
        v-model:home-red="cards.homeRed"
        v-model:away-yellow="cards.awayYellow"
        v-model:away-red="cards.awayRed"
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
      <button v-if="initial" type="button" class="btn btn--danger score-dialog__delete" @click="clear(close)">
        <span class="score-dialog__btn-symbol" aria-hidden="true">🗑</span> Löschen
      </button>
      <div class="score-dialog__footer-actions">
        <button type="button" class="btn btn--secondary" @click="baseDialog?.close()">
          <span class="score-dialog__btn-symbol" aria-hidden="true">✕</span> Abbrechen
        </button>
        <button type="button" class="btn btn--primary" @click="knockoutDraw ? (attemptedDrawSave = true) : save(close)">
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
    @confirm="confirmPending(close)"
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

.score-dialog__team-name {
  flex: 1;
  text-align: center;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-muted);
  line-height: 1.2;
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
