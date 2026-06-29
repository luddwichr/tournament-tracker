<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { MatchSlot, Team } from '../types/tournament'
import { useTournamentStore } from '../stores/tournament'
import { useAnnounce } from '../composables/use-announce'
import ScoreInput from './ScoreInput.vue'
import DisciplineInput from './DisciplineInput.vue'
import BaseDialog from './BaseDialog.vue'

const props = defineProps<{
  match: MatchSlot
  homeTeam: Team | null
  awayTeam: Team | null
}>()

const emit = defineEmits<{ close: [] }>()

const store = useTournamentStore()
const announce = useAnnounce()
const baseDialog = ref<InstanceType<typeof BaseDialog> | null>(null)

const initial = computed(() => store.results[props.match.id] ?? null)

const homeGoals = ref(initial.value?.homeGoals ?? 0)
const awayGoals = ref(initial.value?.awayGoals ?? 0)
const homeYellow = ref(initial.value?.homeYellow ?? 0)
const homeRed = ref(initial.value?.homeRed ?? 0)
const awayYellow = ref(initial.value?.awayYellow ?? 0)
const awayRed = ref(initial.value?.awayRed ?? 0)
const penaltyWinner = ref<'home' | 'away' | undefined>(initial.value?.penaltyWinner)

const isKnockout = computed(() => props.match.stage !== 'group')
const showPenaltyPicker = computed(() => isKnockout.value && homeGoals.value === awayGoals.value)

// Clear penalty winner whenever scores diverge
watch(showPenaltyPicker, (show) => {
  if (!show) penaltyWinner.value = undefined
})

const title = computed(() => {
  const home = props.homeTeam?.name ?? 'Heim'
  const away = props.awayTeam?.name ?? 'Gast'
  return `Ergebnis: ${home} – ${away}`
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
    ...(showPenaltyPicker.value && penaltyWinner.value ? { penaltyWinner: penaltyWinner.value } : {}),
  })
  const home = props.homeTeam?.name ?? 'Heim'
  const away = props.awayTeam?.name ?? 'Gast'
  announce(`Ergebnis gespeichert: ${home} ${homeGoals.value} : ${awayGoals.value} ${away}`)
  baseDialog.value?.close()
}

function handleClear(): void {
  store.clearResult(props.match.id)
  announce('Ergebnis gelöscht')
  baseDialog.value?.close()
}
</script>

<template>
  <BaseDialog
    ref="baseDialog"
    :title="title"
    max-width="min(90vw, 28rem)"
    @close="emit('close')"
  >
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
        <p
          id="penalty-label"
          class="score-dialog__penalty-label"
        >
          Elfmeterschießen — Sieger
        </p>
        <div class="score-dialog__penalty-btns">
          <button
            type="button"
            class="score-dialog__penalty-btn"
            :class="{ 'score-dialog__penalty-btn--active': penaltyWinner === 'home' }"
            :aria-pressed="penaltyWinner === 'home'"
            @click="penaltyWinner = penaltyWinner === 'home' ? undefined : 'home'"
          >
            {{ homeTeam?.name ?? 'Heim' }}
          </button>
          <button
            type="button"
            class="score-dialog__penalty-btn"
            :class="{ 'score-dialog__penalty-btn--active': penaltyWinner === 'away' }"
            :aria-pressed="penaltyWinner === 'away'"
            @click="penaltyWinner = penaltyWinner === 'away' ? undefined : 'away'"
          >
            {{ awayTeam?.name ?? 'Gast' }}
          </button>
        </div>
      </div>

      <DisciplineInput
        v-model:home-yellow="homeYellow"
        v-model:home-red="homeRed"
        v-model:away-yellow="awayYellow"
        v-model:away-red="awayRed"
      />
    </div>

    <template #footer>
      <button
        v-if="initial"
        type="button"
        class="btn btn--danger score-dialog__delete"
        @click="handleClear"
      >
        Löschen
      </button>
      <div class="score-dialog__footer-actions">
        <button
          type="button"
          class="btn btn--secondary"
          @click="baseDialog?.close()"
        >
          Abbrechen
        </button>
        <button
          type="button"
          class="btn btn--primary"
          @click="handleSave"
        >
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
  transition:
    background var(--motion-duration-base) var(--motion-easing-standard),
    border-color var(--motion-duration-base) var(--motion-easing-standard);
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

.score-dialog__delete {
  margin-right: auto;
}

.score-dialog__footer-actions {
  display: flex;
  gap: var(--space-2);
}
</style>
