<script setup lang="ts">
import type { Team } from '../types/tournament'
import TeamLabel from './TeamLabel.vue'
import BaseDialog from './BaseDialog.vue'

defineProps<{
  /** German label for the slot (e.g. team name or placeholder). */
  label: string
  /** Teams that could fill the slot. */
  possibleTeams: Team[]
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <BaseDialog title="Mögliche Teams" max-width="min(92vw, 28rem)" max-height="min(90vh, 36rem)" @close="emit('close')">
    <div class="possible-teams-dialog__content">
      <h3 class="possible-teams-dialog__section-title">
        {{ label }}
      </h3>
      <ul class="possible-teams-dialog__list" role="list">
        <li v-for="team in possibleTeams" :key="team.id" class="possible-teams-dialog__item">
          <TeamLabel :team="team" />
        </li>
      </ul>
    </div>
  </BaseDialog>
</template>

<style scoped>
.possible-teams-dialog__content {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.possible-teams-dialog__section-title {
  margin: 0;
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
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-bg);
  min-height: var(--tap-target);
}
</style>
