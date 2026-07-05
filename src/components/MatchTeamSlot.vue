<script setup lang="ts">
import type { Team } from '../types/tournament'
import TeamLabel from './TeamLabel.vue'

defineProps<{
  team: Team | null
  side: 'home' | 'away'
  placeholder?: string
}>()

const emit = defineEmits<{ placeholderClick: [] }>()
</script>

<template>
  <span class="match-team-slot" :class="`match-team-slot--${side}`">
    <TeamLabel v-if="team" :team="team" clickable />
    <button
      v-else
      type="button"
      class="match-team-slot__placeholder"
      :aria-label="`Mögliche Teams: ${placeholder ?? '?'}`"
      @click.stop="emit('placeholderClick')"
    >
      {{ placeholder ?? '?' }}
    </button>
  </span>
</template>

<style scoped>
.match-team-slot {
  display: flex;
  align-items: center;
  min-width: 0;
}

.match-team-slot__placeholder {
  display: inline-flex;
  align-items: center;
  background: none;
  border: none;
  padding: 0;
  min-height: var(--tap-target);
  color: var(--color-text-muted);
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  cursor: pointer;
  border-radius: var(--radius-sm);
}

.match-team-slot__placeholder:hover {
  color: var(--color-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>
