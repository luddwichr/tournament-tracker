<script setup lang="ts">
import { useTemplateRef, ref, watch } from 'vue'
import type { MatchSlot, Team } from '../types/tournament'
import ScoreInput from './ScoreInput.vue'
import DisciplineInput from './DisciplineInput.vue'
import BaseDialog from './BaseDialog.vue'
import { useMatchResultForm } from '../composables/use-match-result-form'

const props = defineProps<{
  match: MatchSlot
  homeTeam: Team
  awayTeam: Team
}>()

const emit = defineEmits<{ close: [] }>()

const baseDialog = useTemplateRef<InstanceType<typeof BaseDialog>>('baseDialog')
const close = () => baseDialog.value?.close()

const { homeGoals, awayGoals, homeYellow, homeRed, awayYellow, awayRed, knockoutDraw, title, initial, save, clear } =
  useMatchResultForm(props.match, props.homeTeam, props.awayTeam)

const showDrawError = ref(false)
watch(knockoutDraw, (isDraw) => {
  if (!isDraw) showDrawError.value = false
})
</script>

<template>
  <BaseDialog ref="baseDialog" :title="title" max-width="min(90vw, 28rem)" @close="emit('close')">
    <div class="score-dialog__body">
      <ScoreInput v-model:home="homeGoals" v-model:away="awayGoals" :home-team="homeTeam" :away-team="awayTeam" />

      <p v-if="showDrawError" class="score-dialog__draw-error" role="alert">
        Unentschieden geht nicht! Wer hat gewonnen?
      </p>

      <DisciplineInput
        v-model:home-yellow="homeYellow"
        v-model:home-red="homeRed"
        v-model:away-yellow="awayYellow"
        v-model:away-red="awayRed"
      />
    </div>

    <template #footer>
      <button v-if="initial" type="button" class="btn btn--danger score-dialog__delete" @click="clear(close)">
        Löschen
      </button>
      <div class="score-dialog__footer-actions">
        <button type="button" class="btn btn--secondary" @click="baseDialog?.close()">Abbrechen</button>
        <button type="button" class="btn btn--primary" @click="knockoutDraw ? (showDrawError = true) : save(close)">
          Speichern
        </button>
      </div>
    </template>
  </BaseDialog>
</template>

<style scoped>
.score-dialog__body {
  padding: var(--space-5) var(--space-4) var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.score-dialog__draw-error {
  margin: 0;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 600;
  background: color-mix(in srgb, var(--color-draw) 12%, transparent);
  color: var(--color-draw);
  border: 2px solid var(--color-draw);
}

.score-dialog__delete {
  margin-right: auto;
}

.score-dialog__footer-actions {
  display: flex;
  gap: var(--space-2);
}
</style>
