<script setup lang="ts">
const homeYellow = defineModel<number>('homeYellow', { required: true })
const homeRed = defineModel<number>('homeRed', { required: true })
const awayYellow = defineModel<number>('awayYellow', { required: true })
const awayRed = defineModel<number>('awayRed', { required: true })

function dec(current: number, setter: (v: number) => void): void {
  setter(Math.max(0, current - 1))
}
</script>

<template>
  <div class="discipline-input">
    <p class="discipline-input__heading">Karten</p>

    <div class="discipline-input__grid">
      <div class="discipline-input__group">
        <span class="discipline-input__side-label">Heim</span>
        <div class="discipline-input__row">
          <span class="discipline-input__card-label">Gelb</span>
          <div class="discipline-input__counter">
            <button
              type="button"
              class="discipline-input__step"
              aria-label="Gelbe Karte Heim abziehen"
              @click="dec(homeYellow, (v) => (homeYellow = v))"
            >−</button>
            <span class="discipline-input__value" aria-live="polite">{{ homeYellow }}</span>
            <button
              type="button"
              class="discipline-input__step"
              aria-label="Gelbe Karte Heim hinzufügen"
              @click="homeYellow = homeYellow + 1"
            >+</button>
          </div>
        </div>
        <div class="discipline-input__row">
          <span class="discipline-input__card-label">Rot</span>
          <div class="discipline-input__counter">
            <button
              type="button"
              class="discipline-input__step"
              aria-label="Rote Karte Heim abziehen"
              @click="dec(homeRed, (v) => (homeRed = v))"
            >−</button>
            <span class="discipline-input__value" aria-live="polite">{{ homeRed }}</span>
            <button
              type="button"
              class="discipline-input__step"
              aria-label="Rote Karte Heim hinzufügen"
              @click="homeRed = homeRed + 1"
            >+</button>
          </div>
        </div>
      </div>

      <div class="discipline-input__group">
        <span class="discipline-input__side-label">Gast</span>
        <div class="discipline-input__row">
          <span class="discipline-input__card-label">Gelb</span>
          <div class="discipline-input__counter">
            <button
              type="button"
              class="discipline-input__step"
              aria-label="Gelbe Karte Gast abziehen"
              @click="dec(awayYellow, (v) => (awayYellow = v))"
            >−</button>
            <span class="discipline-input__value" aria-live="polite">{{ awayYellow }}</span>
            <button
              type="button"
              class="discipline-input__step"
              aria-label="Gelbe Karte Gast hinzufügen"
              @click="awayYellow = awayYellow + 1"
            >+</button>
          </div>
        </div>
        <div class="discipline-input__row">
          <span class="discipline-input__card-label">Rot</span>
          <div class="discipline-input__counter">
            <button
              type="button"
              class="discipline-input__step"
              aria-label="Rote Karte Gast abziehen"
              @click="dec(awayRed, (v) => (awayRed = v))"
            >−</button>
            <span class="discipline-input__value" aria-live="polite">{{ awayRed }}</span>
            <button
              type="button"
              class="discipline-input__step"
              aria-label="Rote Karte Gast hinzufügen"
              @click="awayRed = awayRed + 1"
            >+</button>
          </div>
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

.discipline-input__counter {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.discipline-input__step {
  width: 2.25rem;
  height: 2.25rem;
  font-size: var(--font-size-lg);
  font-weight: 700;
  line-height: 1;
  background: var(--color-bg);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.discipline-input__step:hover {
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-color: var(--color-primary);
}

.discipline-input__value {
  font-size: var(--font-size-lg);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  min-width: 1.5rem;
  text-align: center;
}
</style>
