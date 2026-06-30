<script setup lang="ts">
import StepperInput from './StepperInput.vue'
import CardIcon from './icons/CardIcon.vue'
import CardsIcon from './icons/CardsIcon.vue'

const homeYellow = defineModel<number>('homeYellow', { required: true })
const homeRed = defineModel<number>('homeRed', { required: true })
const awayYellow = defineModel<number>('awayYellow', { required: true })
const awayRed = defineModel<number>('awayRed', { required: true })
</script>

<template>
  <fieldset class="discipline-input">
    <legend class="discipline-input__heading">
      <CardsIcon class="discipline-input__legend-icon" />
      Karten
    </legend>

    <div class="discipline-input__grid">
      <div class="discipline-input__group" role="group" aria-label="Heim">
        <div class="discipline-input__row">
          <CardIcon color="yellow" class="discipline-input__card" />
          <StepperInput
            v-model="homeYellow"
            dec-label="Gelbe Karte Heim abziehen"
            inc-label="Gelbe Karte Heim hinzufügen"
          />
        </div>
        <div class="discipline-input__row">
          <CardIcon color="red" class="discipline-input__card" />
          <StepperInput v-model="homeRed" dec-label="Rote Karte Heim abziehen" inc-label="Rote Karte Heim hinzufügen" />
        </div>
      </div>

      <div class="discipline-input__group" role="group" aria-label="Gast">
        <div class="discipline-input__row">
          <CardIcon color="yellow" class="discipline-input__card" />
          <StepperInput
            v-model="awayYellow"
            dec-label="Gelbe Karte Gast abziehen"
            inc-label="Gelbe Karte Gast hinzufügen"
          />
        </div>
        <div class="discipline-input__row">
          <CardIcon color="red" class="discipline-input__card" />
          <StepperInput v-model="awayRed" dec-label="Rote Karte Gast abziehen" inc-label="Rote Karte Gast hinzufügen" />
        </div>
      </div>
    </div>
  </fieldset>
</template>

<style scoped>
.discipline-input {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4) var(--space-4);
}

.discipline-input__heading {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0 var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  font-weight: 600;
  margin-left: auto;
  margin-right: auto;
}

.discipline-input__legend-icon {
  width: 1.4em;
  height: 1.2em;
  flex-shrink: 0;
}

.discipline-input__grid {
  display: flex;
  gap: var(--space-5);
  flex-wrap: wrap;
}

.discipline-input__group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
  min-width: 10rem;
}

.discipline-input__row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.discipline-input__card {
  flex-shrink: 0;
  width: 0.75rem;
  height: 1.375rem;
}
</style>
