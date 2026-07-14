<script lang="ts">
import type { SyncStatus } from '../composables/use-results-sync'

const TITLES: Record<SyncStatus, string> = {
  confirm: 'Ergebnisse abrufen',
  done: 'Aktualisierung abgeschlossen',
  error: 'Abruf fehlgeschlagen',
  idle: 'Ergebnisse abrufen',
  syncing: 'Ergebnisse werden abgerufen',
}
</script>

<script setup lang="ts">
import { computed, useId, useTemplateRef } from 'vue'
import BaseDialog from './BaseDialog.vue'

const { status, count } = defineProps<{
  status: SyncStatus
  error: string | null
  count: number
}>()

const emit = defineEmits<{ confirm: []; cancel: []; retry: [] }>()

const baseDialog = useTemplateRef<InstanceType<typeof BaseDialog>>('baseDialog')
const descId = useId()

const title = computed(() => TITLES[status])

/** Text for the persistent `role="status"` element below — kept as a single
 * computed so the element itself stays mounted across the confirm → syncing →
 * done transition instead of being freshly created by `v-if`/`v-else-if`,
 * which most screen readers won't announce (the live region must already
 * exist before its content changes). */
const statusMessage = computed(() => {
  if (status === 'syncing') {
    return 'Daten werden abgerufen …'
  }
  if (status === 'done') {
    return `${count} Spiele wurden aktualisiert.`
  }
  return ''
})

/** Trigger the native close, which surfaces as `@close` → `cancel`. */
function close(): void {
  baseDialog.value?.close()
}
</script>

<template>
  <BaseDialog
    ref="baseDialog"
    :title="title"
    :aria-describedby="descId"
    max-width="var(--dialog-width-sm)"
    :show-close-button="false"
    @close="emit('cancel')"
  >
    <div :id="descId" class="sync-dialog__body">
      <p v-if="status === 'confirm'">
        Alle vorhandenen Ergebnisse werden durch die abgerufenen Daten (Tore und Karten) ersetzt.
      </p>

      <span v-if="status === 'syncing'" class="sync-dialog__spinner" role="img" aria-label="Wird geladen">⚽</span>

      <p :class="status === 'done' ? 'sync-dialog__done' : 'sync-dialog__status'" role="status">
        <span v-if="status === 'done'" aria-hidden="true">✅ </span>{{ statusMessage }}
      </p>

      <p v-if="status === 'error'" class="sync-dialog__error" role="alert">
        {{ error ?? 'Abruf fehlgeschlagen.' }}
      </p>
    </div>

    <template #footer>
      <template v-if="status === 'confirm'">
        <button type="button" class="btn btn--secondary" @click="close">Abbrechen</button>
        <button type="button" class="btn btn--danger" @click="emit('confirm')">Abrufen &amp; ersetzen</button>
      </template>

      <button v-else-if="status === 'syncing'" type="button" class="btn btn--secondary" @click="close">
        Abbrechen
      </button>

      <button v-else-if="status === 'done'" type="button" class="btn btn--primary" @click="close">Schließen</button>

      <template v-else-if="status === 'error'">
        <button type="button" class="btn btn--secondary" @click="close">Abbrechen</button>
        <button type="button" class="btn btn--primary" @click="emit('retry')">Erneut versuchen</button>
      </template>
    </template>
  </BaseDialog>
</template>

<style scoped>
.sync-dialog__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-4);
  text-align: center;
}

.sync-dialog__spinner {
  font-size: 2.75rem;
  line-height: 1;
  display: inline-block;
  animation: sync-dialog-spin 0.9s linear infinite;
}

@keyframes sync-dialog-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sync-dialog__spinner {
    animation: none;
  }
}

.sync-dialog__status {
  margin: 0;
  color: var(--color-text-muted);
}

.sync-dialog__done {
  margin: 0;
  font-weight: var(--font-weight-semibold);
}

.sync-dialog__error {
  margin: 0;
  color: var(--color-loss);
}
</style>
