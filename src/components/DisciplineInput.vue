<script setup lang="ts">
import CardIcon from './icons/CardIcon.vue'
import CardsIcon from './icons/CardsIcon.vue'
import StepperInput from './StepperInput.vue'
import type { Team } from '../types/tournament'
import TeamFlag from './TeamFlag.vue'
import { useId } from 'vue'

const { homeTeam, awayTeam } = defineProps<{
  homeTeam: Team
  awayTeam: Team
}>()

const homeYellow = defineModel<number>('homeYellow', { required: true })
const homeRed = defineModel<number>('homeRed', { required: true })
const awayYellow = defineModel<number>('awayYellow', { required: true })
const awayRed = defineModel<number>('awayRed', { required: true })

// Each side's stepper labels and its group are named after the actual team.
// That matches ScoreInput's "… für <Team>" pattern instead of the abstract "Heim" and "Gast".
// The abstract labels read inconsistently against the goal steppers one dialog over.
const homeLabelId = useId()
const awayLabelId = useId()
</script>

<template>
  <fieldset class="discipline-input">
    <legend class="discipline-input__heading">
      <CardsIcon class="discipline-input__legend-icon" />
      Karten
    </legend>

    <div class="discipline-input__grid">
      <div class="discipline-input__group" role="group" :aria-labelledby="homeLabelId">
        <p :id="homeLabelId" class="discipline-input__side">
          <TeamFlag :flag-code="homeTeam.flagCode" size="1.25rem" />
          <span class="discipline-input__side-name">{{ homeTeam.name }}</span>
        </p>
        <div class="discipline-input__row">
          <CardIcon color="yellow" class="discipline-input__card" />
          <StepperInput
            v-model="homeYellow"
            :value-label="`Gelbe Karte für ${homeTeam.name}`"
            :dec-label="`Gelbe Karte für ${homeTeam.name} abziehen`"
            :inc-label="`Gelbe Karte für ${homeTeam.name} hinzufügen`"
          />
        </div>
        <div class="discipline-input__row">
          <CardIcon color="red" class="discipline-input__card" />
          <StepperInput
            v-model="homeRed"
            :value-label="`Rote Karte für ${homeTeam.name}`"
            :dec-label="`Rote Karte für ${homeTeam.name} abziehen`"
            :inc-label="`Rote Karte für ${homeTeam.name} hinzufügen`"
          />
        </div>
      </div>

      <div class="discipline-input__group" role="group" :aria-labelledby="awayLabelId">
        <p :id="awayLabelId" class="discipline-input__side">
          <TeamFlag :flag-code="awayTeam.flagCode" size="1.25rem" />
          <span class="discipline-input__side-name">{{ awayTeam.name }}</span>
        </p>
        <div class="discipline-input__row">
          <CardIcon color="yellow" class="discipline-input__card" />
          <StepperInput
            v-model="awayYellow"
            :value-label="`Gelbe Karte für ${awayTeam.name}`"
            :dec-label="`Gelbe Karte für ${awayTeam.name} abziehen`"
            :inc-label="`Gelbe Karte für ${awayTeam.name} hinzufügen`"
          />
        </div>
        <div class="discipline-input__row">
          <CardIcon color="red" class="discipline-input__card" />
          <StepperInput
            v-model="awayRed"
            :value-label="`Rote Karte für ${awayTeam.name}`"
            :dec-label="`Rote Karte für ${awayTeam.name} abziehen`"
            :inc-label="`Rote Karte für ${awayTeam.name} hinzufügen`"
          />
        </div>
      </div>
    </div>
  </fieldset>
</template>

<style scoped>
.discipline-input {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-2) var(--space-4);
}

.discipline-input__heading {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0 var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  font-weight: var(--font-weight-semibold);
  margin-inline: auto;
}

.discipline-input__legend-icon {
  width: 1.4em;
  height: 1.2em;
  flex-shrink: 0;
}

.discipline-input__grid {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.discipline-input__group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
  min-width: 9rem;
}

.discipline-input__side {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.discipline-input__side-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.discipline-input__row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.discipline-input__card {
  flex-shrink: 0;
  height: 1.25em;
}
</style>
