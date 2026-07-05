<script setup lang="ts">
import { ref, computed, useTemplateRef } from 'vue'
import type { Result } from '../types/tournament'
import { useTournamentStore } from '../stores/tournament'
import { useSettingsStore } from '../stores/settings'
import { exportJson, parseImport } from '../lib/persistence'
import { useResultsSync } from '../composables/use-results-sync'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import SyncDialog from '../components/SyncDialog.vue'
import ThemePicker from '../components/ThemePicker.vue'

const store = useTournamentStore()
const settings = useSettingsStore()
const {
  status: syncStatus,
  progress: syncProgress,
  error: syncError,
  count: syncCount,
  open: openSync,
  run: runSync,
  cancel: cancelSync,
} = useResultsSync((results) => store.importResults(results))

type PendingAction = { kind: 'reset' } | { kind: 'import'; results: Record<string, Result> }

const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const importError = ref<string | null>(null)
const pending = ref<PendingAction | null>(null)

const confirmConfig = computed(() => {
  if (pending.value?.kind === 'import') {
    return {
      title: 'Daten importieren',
      message: 'Alle vorhandenen Ergebnisse werden durch die importierten Daten ersetzt.',
      confirmLabel: 'Ersetzen',
    }
  }
  if (pending.value?.kind === 'reset') {
    return {
      title: 'Zurücksetzen',
      message: 'Alle eingegebenen Ergebnisse werden unwiderruflich gelöscht.',
      confirmLabel: 'Zurücksetzen',
    }
  }
  return null
})

function handleExport(): void {
  exportJson(store.results)
}

function handleImportClick(): void {
  importError.value = null
  fileInput.value?.click()
}

function handleFileChange(event: Event): void {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  // oxlint-disable-next-line unicorn/prefer-add-event-listener -- assignment style keeps the FileReader test double in SettingsView.spec.ts simple
  reader.onload = () => {
    try {
      const newResults = parseImport(reader.result as string)
      pending.value = { kind: 'import', results: newResults }
    } catch (e) {
      importError.value = e instanceof Error ? e.message : 'Fehler beim Importieren.'
    } finally {
      if (fileInput.value) fileInput.value.value = ''
    }
  }
  // oxlint-disable-next-line unicorn/prefer-add-event-listener -- assignment style keeps the FileReader test double in SettingsView.spec.ts simple
  reader.onerror = () => {
    importError.value = 'Fehler beim Lesen der Datei.'
  }
  reader.readAsText(file)
}

function handleReset(): void {
  pending.value = { kind: 'reset' }
}

function handleConfirm(): void {
  const action = pending.value
  pending.value = null
  if (action?.kind === 'import') store.importResults(action.results)
  else if (action?.kind === 'reset') store.reset()
}

function handleCancel(): void {
  pending.value = null
}
</script>

<template>
  <div class="settings-view">
    <h1 class="view-heading">Einstellungen</h1>

    <div class="settings-view__sections">
      <section class="settings-view__section">
        <h2>Erscheinungsbild</h2>
        <ThemePicker v-model="settings.theme" />
      </section>

      <section class="settings-view__section">
        <h2>Daten</h2>

        <div class="settings-view__actions">
          <button type="button" class="btn btn--secondary" @click="handleExport">Exportieren</button>
          <button type="button" class="btn btn--secondary" @click="handleImportClick">Importieren</button>
          <button type="button" class="btn btn--secondary" @click="openSync">Ergebnisse abrufen</button>
          <button type="button" class="btn btn--danger" @click="handleReset">Zurücksetzen</button>
        </div>

        <p v-if="importError" class="settings-view__error" role="alert">
          {{ importError }}
        </p>

        <input
          ref="fileInput"
          type="file"
          accept=".json,application/json"
          class="visually-hidden"
          aria-hidden="true"
          tabindex="-1"
          @change="handleFileChange"
        />
      </section>
    </div>
  </div>

  <ConfirmDialog
    v-if="confirmConfig"
    :title="confirmConfig.title"
    :message="confirmConfig.message"
    :confirm-label="confirmConfig.confirmLabel"
    @confirm="handleConfirm"
    @cancel="handleCancel"
  />

  <SyncDialog
    v-if="syncStatus !== 'idle'"
    :status="syncStatus"
    :progress="syncProgress"
    :error="syncError"
    :count="syncCount"
    @confirm="runSync"
    @retry="runSync"
    @cancel="cancelSync"
  />
</template>

<style scoped>
.settings-view {
  max-width: 40rem;
  margin-inline: auto;
}

/*
 * .view-heading (base.css) sets margin-block-end: var(--space-4); this view
 * wants extra breathing room before its sections, so override it here. Needs
 * the extra class-selector specificity (over .view-heading's single class)
 * to win the cascade.
 */
.settings-view h1 {
  margin-block-end: var(--space-6);
}

.settings-view__sections {
  display: flex;
  flex-direction: column;
  gap: var(--space-7);
}

.settings-view__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

h2 {
  font-size: var(--font-size-lg);
  margin: 0;
}

.settings-view__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.settings-view__error {
  color: var(--color-loss);
  margin: 0;
  font-size: var(--font-size-sm);
}
</style>
