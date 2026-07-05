<script setup lang="ts">
import type { Team } from '../types/tournament'
import TeamFlag from './TeamFlag.vue'
import { useTeamViewer } from '../composables/use-team-viewer'

const props = defineProps<{
  team: Team
  clickable?: boolean
}>()

const openTeamView = useTeamViewer()

function handleClick(e: MouseEvent): void {
  if (!props.clickable) return
  e.stopPropagation()
  openTeamView(props.team)
}
</script>

<template>
  <component
    :is="clickable ? 'button' : 'span'"
    class="team-label"
    :class="{ 'team-label--btn': clickable }"
    :type="clickable ? 'button' : undefined"
    :aria-label="clickable ? `${team.name} – Details anzeigen` : undefined"
    @click="handleClick"
  >
    <TeamFlag :flag-code="team.flagCode" size="1.5rem" />
    <span class="team-label__name">{{ team.name }}</span>
  </component>
</template>

<style scoped>
.team-label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.team-label--btn {
  background: none;
  border: none;
  padding: 0;
  min-height: var(--tap-target);
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  border-radius: var(--radius-sm);
}

.team-label--btn .team-label__name {
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 2px;
}

.team-label--btn:hover .team-label__name {
  text-decoration-color: var(--color-primary);
}

.team-label__name {
  font-weight: var(--font-weight-semibold);
  line-height: 1.2;
}
</style>
