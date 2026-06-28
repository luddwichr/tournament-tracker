<script setup lang="ts">
import { ref } from 'vue'
import type { Team } from '../types/tournament'
import TeamFlag from './TeamFlag.vue'
import SquadDialog from './SquadDialog.vue'
import { squads } from '../data/squads'

const props = defineProps<{
  team: Team
  flagSize?: string
  /** When true, renders as a button that opens the squad viewer dialog. */
  clickable?: boolean
}>()

const squadOpen = ref(false)
const players = squads[props.team.id] ?? []

function handleClick(e: MouseEvent): void {
  if (!props.clickable) return
  e.stopPropagation()
  squadOpen.value = true
}
</script>

<template>
  <component
    :is="clickable ? 'button' : 'span'"
    class="team-label"
    :class="{ 'team-label--btn': clickable }"
    :type="clickable ? 'button' : undefined"
    :aria-label="clickable ? `${team.name} – Kader anzeigen` : undefined"
    :style="flagSize ? { '--flag-size': flagSize } : {}"
    @click="handleClick"
  >
    <TeamFlag :flag-code="team.flagCode" :name="team.name" />
    <span class="team-label__name">{{ team.name }}</span>
  </component>

  <Teleport to="body">
    <SquadDialog v-if="squadOpen" :team="team" :players="players" @close="squadOpen = false" />
  </Teleport>
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

.team-label--btn:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.team-label__name {
  font-weight: 600;
  line-height: 1.2;
}
</style>
