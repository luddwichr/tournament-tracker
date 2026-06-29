<script setup lang="ts">
import type { Team } from '../types/tournament'
import StepperInput from './StepperInput.vue'

const props = defineProps<{
  homeTeam: Team
  awayTeam: Team
}>()

const homeGoals = defineModel<number>('home', { required: true })
const awayGoals = defineModel<number>('away', { required: true })
</script>

<template>
  <div class="score-input" role="group" aria-label="Tore">
    <div class="score-input__side">
      <span class="score-input__team-name">{{ props.homeTeam.name }}</span>
      <StepperInput
        v-model="homeGoals"
        size="lg"
        :dec-label="`Tor für ${props.homeTeam.name} abziehen`"
        :inc-label="`Tor für ${props.homeTeam.name} hinzufügen`"
      />
    </div>

    <span class="score-input__sep" aria-hidden="true">:</span>

    <div class="score-input__side">
      <span class="score-input__team-name">{{ props.awayTeam.name }}</span>
      <StepperInput
        v-model="awayGoals"
        size="lg"
        :dec-label="`Tor für ${props.awayTeam.name} abziehen`"
        :inc-label="`Tor für ${props.awayTeam.name} hinzufügen`"
      />
    </div>
  </div>
</template>

<style scoped>
.score-input {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: var(--space-3);
}

.score-input__side {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  flex: 1;
}

.score-input__team-name {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  text-align: center;
  line-height: 1.2;
}

.score-input__sep {
  font-size: var(--font-size-score);
  font-weight: 700;
  flex-shrink: 0;
  padding-bottom: calc((var(--tap-target) - 1lh) / 2);
}
</style>
