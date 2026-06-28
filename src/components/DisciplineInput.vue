<script setup lang="ts">
import StepperInput from './StepperInput.vue'

const homeYellow = defineModel<number>('homeYellow', { required: true })
const homeRed = defineModel<number>('homeRed', { required: true })
const awayYellow = defineModel<number>('awayYellow', { required: true })
const awayRed = defineModel<number>('awayRed', { required: true })
</script>

<template>
  <div class="discipline-input">
    <p class="discipline-input__heading">Karten</p>

    <div class="discipline-input__grid">
      <div class="discipline-input__group">
        <span class="discipline-input__side-label">Heim</span>
        <div class="discipline-input__row">
          <span class="discipline-input__card-label">Gelb</span>
          <StepperInput
            v-model="homeYellow"
            dec-label="Gelbe Karte Heim abziehen"
            inc-label="Gelbe Karte Heim hinzufügen"
          />
        </div>
        <div class="discipline-input__row">
          <span class="discipline-input__card-label">Rot</span>
          <StepperInput v-model="homeRed" dec-label="Rote Karte Heim abziehen" inc-label="Rote Karte Heim hinzufügen" />
        </div>
      </div>

      <div class="discipline-input__group">
        <span class="discipline-input__side-label">Gast</span>
        <div class="discipline-input__row">
          <span class="discipline-input__card-label">Gelb</span>
          <StepperInput
            v-model="awayYellow"
            dec-label="Gelbe Karte Gast abziehen"
            inc-label="Gelbe Karte Gast hinzufügen"
          />
        </div>
        <div class="discipline-input__row">
          <span class="discipline-input__card-label">Rot</span>
          <StepperInput v-model="awayRed" dec-label="Rote Karte Gast abziehen" inc-label="Rote Karte Gast hinzufügen" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.discipline-input {
  border-top: 1px solid var(--color-border);
  margin-top: var(--space-3);
  padding-top: var(--space-3);
}

.discipline-input__heading {
  margin: 0 0 var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  font-weight: 600;
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

.discipline-input__side-label {
  font-weight: 700;
  font-size: var(--font-size-sm);
}

.discipline-input__row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.discipline-input__card-label {
  font-size: var(--font-size-sm);
  min-width: 2.5rem;
}
</style>
