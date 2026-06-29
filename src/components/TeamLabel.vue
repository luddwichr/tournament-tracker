<script setup lang="ts">
import type { Team } from '../types/tournament'
import TeamFlag from './TeamFlag.vue'
import { useSquadViewer } from '../composables/use-squad-viewer'

const props = defineProps<{
  team: Team
  /** When true, renders as a button that opens the squad viewer dialog. */
  clickable?: boolean
}>()

const openSquad = useSquadViewer()

function handleClick(e: MouseEvent): void {
  if (!props.clickable) return
  e.stopPropagation()
  openSquad(props.team)
}
</script>

<template>
  <component
    :is="clickable ? 'button' : 'span'"
    class="team-label"
    :class="{ 'team-label--btn': clickable }"
    :type="clickable ? 'button' : undefined"
    :aria-label="clickable ? `${team.name} – Kader anzeigen` : undefined"
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
  font-weight: 600;
  line-height: 1.2;
}
</style>
