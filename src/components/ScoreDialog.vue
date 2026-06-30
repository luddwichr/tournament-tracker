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
      <div class="score-dialog__teams" aria-hidden="true">
        <span class="score-dialog__team-name">{{ homeTeam.name }}</span>
        <span class="score-dialog__team-name">{{ awayTeam.name }}</span>
      </div>

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
        <span class="score-dialog__btn-symbol" aria-hidden="true">🗑</span> Löschen
      </button>
      <div class="score-dialog__footer-actions">
        <button type="button" class="btn btn--secondary" @click="baseDialog?.close()">
          <span class="score-dialog__btn-symbol" aria-hidden="true">✕</span> Abbrechen
        </button>
        <button type="button" class="btn btn--primary" @click="knockoutDraw ? (showDrawError = true) : save(close)">
          <span class="score-dialog__btn-symbol" aria-hidden="true">✓</span> Speichern
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

.score-dialog__teams {
  display: flex;
  justify-content: space-between;
  padding: 0 var(--space-1);
}

.score-dialog__team-name {
  flex: 1;
  text-align: center;
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--color-text-muted);
  line-height: 1.2;
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

.score-dialog__btn-symbol {
  margin-right: 0.3em;
}

.score-dialog__delete {
  margin-right: auto;
  margin-left: var(--space-2);
}

.score-dialog__footer-actions {
  display: flex;
  gap: var(--space-2);
}
</style>
