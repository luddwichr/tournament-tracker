<script setup lang="ts">
import type { Team } from '../types/tournament'

const props = defineProps<{
  homeTeam: Team | null
  awayTeam: Team | null
}>()

const homeGoals = defineModel<number>('home', { required: true })
const awayGoals = defineModel<number>('away', { required: true })

function decrement(current: number, setter: (v: number) => void): void {
  setter(Math.max(0, current - 1))
}
</script>

<template>
  <div class="score-input" role="group" aria-label="Tore">
    <div class="score-input__side">
      <span class="score-input__team-name">{{ props.homeTeam?.name ?? 'Heim' }}</span>
      <div class="score-input__counter">
        <button
          type="button"
          class="score-input__step"
          aria-label="`Tor für ${props.homeTeam?.name ?? 'Heim'} abziehen`"
          @click="decrement(homeGoals, (v) => (homeGoals = v))"
        >−</button>
        <span class="score-input__value" aria-live="polite" aria-atomic="true">{{ homeGoals }}</span>
        <button
          type="button"
          class="score-input__step"
          aria-label="`Tor für ${props.homeTeam?.name ?? 'Heim'} hinzufügen`"
          @click="homeGoals = homeGoals + 1"
        >+</button>
      </div>
    </div>

    <span class="score-input__sep" aria-hidden="true">:</span>

    <div class="score-input__side">
      <span class="score-input__team-name">{{ props.awayTeam?.name ?? 'Gast' }}</span>
      <div class="score-input__counter">
        <button
          type="button"
          class="score-input__step"
          aria-label="`Tor für ${props.awayTeam?.name ?? 'Gast'} abziehen`"
          @click="decrement(awayGoals, (v) => (awayGoals = v))"
        >−</button>
        <span class="score-input__value" aria-live="polite" aria-atomic="true">{{ awayGoals }}</span>
        <button
          type="button"
          class="score-input__step"
          aria-label="`Tor für ${props.awayTeam?.name ?? 'Gast'} hinzufügen`"
          @click="awayGoals = awayGoals + 1"
        >+</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.score-input {
  display: flex;
  align-items: center;
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

.score-input__counter {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.score-input__step {
  width: var(--tap-target);
  height: var(--tap-target);
  font-size: var(--font-size-xl);
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

.score-input__step:hover {
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  border-color: var(--color-primary);
}

.score-input__step:active {
  background: color-mix(in srgb, var(--color-primary) 20%, transparent);
}

.score-input__value {
  font-size: var(--font-size-score);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  min-width: 2rem;
  text-align: center;
}

.score-input__sep {
  font-size: var(--font-size-score);
  font-weight: 700;
  flex-shrink: 0;
  padding-top: 1.8rem;
}
</style>
