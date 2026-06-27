<script setup lang="ts">
import type { Team } from '../types/tournament'
import TeamFlag from './TeamFlag.vue'

defineProps<{
  team: Team
  /** Flag display size passed through to TeamFlag. Defaults to 2rem. */
  flagSize?: string
}>()
</script>

<template>
  <span class="team-label" :style="flagSize ? { '--flag-size': flagSize } : {}">
    <TeamFlag :flag-code="team.flagCode" :name="team.name" />
    <span class="team-label__name">{{ team.name }}</span>
  </span>
</template>

<style scoped>
.team-label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.team-label__name {
  font-weight: 600;
  line-height: 1.2;
}
</style>
