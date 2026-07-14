<script setup lang="ts">
import StepperInput from './StepperInput.vue'
import type { Team } from '../types/tournament'

withDefaults(
  defineProps<{
    homeTeam: Team
    awayTeam: Team
    /** Fieldset legend, e.g. "Elfmeterschießen" for the shootout variant. */
    legend?: string
    /** Noun used in the steppers' a11y labels ("<noun> für <Team> hinzufügen"). */
    goalNoun?: string
    /** Decorative legend icon. */
    emoji?: string
  }>(),
  { emoji: '⚽', goalNoun: 'Tor', legend: 'Tore' },
)

const homeGoals = defineModel<number>('home', { required: true })
const awayGoals = defineModel<number>('away', { required: true })
</script>

<template>
  <fieldset class="score-input">
    <legend class="score-input__heading">
      <span aria-hidden="true">{{ emoji }}</span> {{ legend }}
    </legend>

    <div class="score-input__grid">
      <div class="score-input__side">
        <StepperInput
          v-model="homeGoals"
          size="lg"
          :dec-label="`${goalNoun} für ${homeTeam.name} abziehen`"
          :inc-label="`${goalNoun} für ${homeTeam.name} hinzufügen`"
        />
      </div>

      <span class="score-input__sep" aria-hidden="true">:</span>

      <div class="score-input__side">
        <StepperInput
          v-model="awayGoals"
          size="lg"
          :dec-label="`${goalNoun} für ${awayTeam.name} abziehen`"
          :inc-label="`${goalNoun} für ${awayTeam.name} hinzufügen`"
        />
      </div>
    </div>
  </fieldset>
</template>

<style scoped>
.score-input {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4) var(--space-4);
}

.score-input__heading {
  padding: 0 var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  font-weight: var(--font-weight-semibold);
  margin-inline: auto;
}

.score-input__grid {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: var(--space-3);
}

.score-input__side {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.score-input__sep {
  font-size: var(--font-size-score);
  font-weight: var(--font-weight-bold);
  flex-shrink: 0;
  padding-bottom: calc((var(--tap-target) - 1lh) / 2);
}
</style>
