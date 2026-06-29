<script setup lang="ts">
import type { Team } from '../types/tournament'
import TeamFlag from './TeamFlag.vue'
import BaseDialog from './BaseDialog.vue'

defineProps<{
  /** German label for the home position (e.g. team name or placeholder). */
  homeLabel: string
  /** German label for the away position. */
  awayLabel: string
  /** Teams that could fill the home slot; empty when slot is already resolved. */
  possibleHome: Team[]
  /** Teams that could fill the away slot; empty when slot is already resolved. */
  possibleAway: Team[]
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <BaseDialog
    title="Mögliche Teams"
    max-width="min(92vw, 28rem)"
    max-height="min(90vh, 36rem)"
    @close="emit('close')"
  >
    <div class="possible-teams-dialog__content">
      <section
        v-if="possibleHome.length > 0"
        class="possible-teams-dialog__section"
      >
        <h3 class="possible-teams-dialog__section-title">
          {{ homeLabel }}
        </h3>
        <ul
          class="possible-teams-dialog__list"
          role="list"
        >
          <li
            v-for="team in possibleHome"
            :key="team.id"
            class="possible-teams-dialog__item"
          >
            <TeamFlag
              :flag-code="team.flagCode"
              :name="team.name"
              :decorative="true"
            />
            <span class="possible-teams-dialog__team-name">{{ team.name }}</span>
          </li>
        </ul>
      </section>

      <section
        v-if="possibleAway.length > 0"
        class="possible-teams-dialog__section"
      >
        <h3 class="possible-teams-dialog__section-title">
          {{ awayLabel }}
        </h3>
        <ul
          class="possible-teams-dialog__list"
          role="list"
        >
          <li
            v-for="team in possibleAway"
            :key="team.id"
            class="possible-teams-dialog__item"
          >
            <TeamFlag
              :flag-code="team.flagCode"
              :name="team.name"
              :decorative="true"
            />
            <span class="possible-teams-dialog__team-name">{{ team.name }}</span>
          </li>
        </ul>
      </section>
    </div>
  </BaseDialog>
</template>

<style scoped>
.possible-teams-dialog__content {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.possible-teams-dialog__section-title {
  margin: 0 0 var(--space-2);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.possible-teams-dialog__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.possible-teams-dialog__item {
  --flag-size: 1.5rem;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  min-height: var(--tap-target);
}

.possible-teams-dialog__team-name {
  font-weight: 600;
  font-size: var(--font-size-base);
}
</style>
