<script setup lang="ts">
import type { Team } from '../types/tournament'
import TeamLabel from './TeamLabel.vue'
import BaseDialog from './BaseDialog.vue'

defineProps<{
  label: string
  possibleTeams: Team[]
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <BaseDialog
    title="Mögliche Teams"
    max-width="var(--dialog-width-sm)"
    max-height="min(90vh, 36rem)"
    @close="emit('close')"
  >
    <div class="possible-teams-dialog__content">
      <h3 class="possible-teams-dialog__section-title">
        {{ label }}
      </h3>
      <!-- eslint-disable-next-line vuejs-accessibility/no-redundant-roles -- role="list" restores the semantic list role that `list-style: none` strips in Safari/VoiceOver -->
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
  font-weight: var(--font-weight-semibold);
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
