<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Team, Player } from '../types/tournament'
import TeamFlag from './TeamFlag.vue'
import SquadList from './SquadList.vue'

defineProps<{
  team: Team
  players: Player[]
}>()

const emit = defineEmits<{ close: [] }>()
const dialogEl = ref<HTMLDialogElement | null>(null)

onMounted(() => {
  dialogEl.value?.showModal()
})
</script>

<template>
  <dialog
    ref="dialogEl"
    class="squad-dialog"
    aria-modal="true"
    :aria-label="`Kader: ${team.name}`"
    @close="emit('close')"
  >
    <div class="squad-dialog__inner">
      <header class="squad-dialog__header">
        <div class="squad-dialog__team-heading">
          <TeamFlag :flag-code="team.flagCode" :name="team.name" />
          <h2 class="squad-dialog__title">{{ team.name }}</h2>
        </div>
        <button type="button" class="squad-dialog__close" aria-label="Schließen" @click="dialogEl?.close()">✕</button>
      </header>

      <div class="squad-dialog__body" tabindex="0">
        <SquadList :players="players" />
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.squad-dialog {
  border: none;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text);
  padding: 0;
  max-width: min(92vw, 32rem);
  width: 100%;
  max-height: min(90vh, 40rem);
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-md);
}

.squad-dialog::backdrop {
  background: rgb(0 0 0 / 0.5);
}

.squad-dialog__inner {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

.squad-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.squad-dialog__team-heading {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.squad-dialog__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 700;
  line-height: 1.2;
}

.squad-dialog__close {
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  font-size: var(--font-size-lg);
  color: var(--color-text-muted);
  border-radius: var(--radius-sm);
  min-width: var(--tap-target);
  min-height: var(--tap-target);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-family: inherit;
}

.squad-dialog__close:hover {
  color: var(--color-text);
  background: var(--color-bg);
}

.squad-dialog__body {
  overflow-y: auto;
  flex: 1;
}
</style>
