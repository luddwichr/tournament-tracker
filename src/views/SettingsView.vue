<script setup lang="ts">
import { clearErrorLog, readErrorLog } from '../lib/error-log'
import { computed, ref, useTemplateRef } from 'vue'
import { exportJson, parseImport } from '../lib/persistence'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import type { ResultsMap } from '../types/tournament'
import SyncDialog from '../components/SyncDialog.vue'
import ThemePicker from '../components/ThemePicker.vue'
import { useResultsSync } from '../composables/use-results-sync'
import { useSettingsStore } from '../stores/settings'
import { useTournamentStore } from '../stores/tournament'

const store = useTournamentStore()
const settings = useSettingsStore()
const {
  status: syncStatus,
  error: syncError,
  count: syncCount,
  open: openSync,
  run: runSync,
  cancel: cancelSync,
} = useResultsSync((results) => {
  store.importResults(results)
})

type PendingAction = { kind: 'reset' } | { kind: 'import'; results: ResultsMap }

const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const importError = ref<string | null>(null)
const pending = ref<PendingAction | null>(null)

const confirmConfig = computed(() => {
  if (pending.value?.kind === 'import') {
    return {
      confirmLabel: 'Ersetzen',
      message: 'Alle vorhandenen Ergebnisse werden durch die importierten Daten ersetzt.',
      title: 'Daten importieren',
    }
  }
  if (pending.value?.kind === 'reset') {
    return {
      confirmLabel: 'Zurücksetzen',
      message: 'Alle eingegebenen Ergebnisse werden unwiderruflich gelöscht.',
      title: 'Zurücksetzen',
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

// Snapshot on mount is enough: new errors can only be logged while this view
// is not being interacted with (a component crash unmounts it anyway).
const errorLog = ref(readErrorLog())

function handleClearErrorLog(): void {
  clearErrorLog()
  errorLog.value = []
}

function formatErrorTime(isoTime: string): string {
  const date = new Date(isoTime)
  return Number.isNaN(date.getTime()) ? isoTime : date.toLocaleString('de-DE')
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

        <!-- tabindex="-1" + the visually-hidden clip already remove this from
             tab order and view; aria-hidden on a focusable control is the
             aria-hidden-focus anti-pattern, so it's deliberately omitted. -->
        <input
          ref="fileInput"
          type="file"
          accept=".json,application/json"
          class="visually-hidden"
          tabindex="-1"
          @change="handleFileChange"
        />
      </section>

      <section class="settings-view__section">
        <h2>Diagnose</h2>

        <p v-if="errorLog.length === 0" class="settings-view__log-empty">Keine Fehler aufgezeichnet.</p>

        <template v-else>
          <ul class="settings-view__log">
            <li v-for="(entry, index) in errorLog" :key="index" class="settings-view__log-entry">
              <time :datetime="entry.time" class="settings-view__log-time">{{ formatErrorTime(entry.time) }}</time>
              <span class="settings-view__log-message">{{ entry.message }}</span>
            </li>
          </ul>

          <div class="settings-view__actions">
            <button type="button" class="btn btn--secondary" @click="handleClearErrorLog">Protokoll löschen</button>
          </div>
        </template>
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
    :error="syncError"
    :count="syncCount"
    @confirm="runSync"
    @retry="runSync"
    @close="cancelSync"
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

.settings-view__log-empty {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.settings-view__log {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.settings-view__log-entry {
  display: flex;
  flex-direction: column;
  font-size: var(--font-size-sm);
}

.settings-view__log-time {
  color: var(--color-text-muted);
}

.settings-view__log-message {
  overflow-wrap: anywhere;
}
</style>
