<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Team } from '../types/tournament'
import TeamFlag from './TeamFlag.vue'
import { useScrollLock } from '../composables/use-scroll-lock'

const props = defineProps<{
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
const dialogEl = ref<HTMLDialogElement | null>(null)

useScrollLock()

onMounted(() => {
  dialogEl.value?.showModal()
})
</script>

<template>
  <dialog
    ref="dialogEl"
    class="possible-teams-dialog"
    aria-modal="true"
    aria-label="Mögliche Teams"
    @close="emit('close')"
  >
    <div class="possible-teams-dialog__inner">
      <header class="possible-teams-dialog__header">
        <h2 class="possible-teams-dialog__title">Mögliche Teams</h2>
        <button type="button" class="possible-teams-dialog__close" aria-label="Schließen" @click="dialogEl?.close()">
          &#x2715;
        </button>
      </header>

      <div class="possible-teams-dialog__body" tabindex="0">
        <section v-if="possibleHome.length > 0" class="possible-teams-dialog__section">
          <h3 class="possible-teams-dialog__section-title">{{ homeLabel }}</h3>
          <ul class="possible-teams-dialog__list" role="list">
            <li v-for="team in possibleHome" :key="team.id" class="possible-teams-dialog__item">
              <TeamFlag :flag-code="team.flagCode" :name="team.name" />
              <span class="possible-teams-dialog__team-name">{{ team.name }}</span>
            </li>
          </ul>
        </section>

        <section v-if="possibleAway.length > 0" class="possible-teams-dialog__section">
          <h3 class="possible-teams-dialog__section-title">{{ awayLabel }}</h3>
          <ul class="possible-teams-dialog__list" role="list">
            <li v-for="team in possibleAway" :key="team.id" class="possible-teams-dialog__item">
              <TeamFlag :flag-code="team.flagCode" :name="team.name" />
              <span class="possible-teams-dialog__team-name">{{ team.name }}</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.possible-teams-dialog {
  border: none;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text);
  padding: 0;
  max-width: min(92vw, 28rem);
  width: 100%;
  max-height: min(90vh, 36rem);
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
}

.possible-teams-dialog::backdrop {
  background: var(--color-scrim);
}

.possible-teams-dialog__inner {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

.possible-teams-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.possible-teams-dialog__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 700;
  line-height: 1.2;
}

.possible-teams-dialog__close {
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

.possible-teams-dialog__close:hover {
  color: var(--color-text);
  background: var(--color-bg);
}

.possible-teams-dialog__close:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.possible-teams-dialog__body {
  overflow-y: auto;
  overscroll-behavior: contain;
  flex: 1;
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
