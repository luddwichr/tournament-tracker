<script setup lang="ts">
import { ref } from 'vue'
import { useTournamentStore } from '../stores/tournament'
import { exportJson, parseImport } from '../lib/persistence'

const store = useTournamentStore()
const fileInput = ref<HTMLInputElement | null>(null)
const importError = ref<string | null>(null)

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
  reader.onload = () => {
    try {
      const newResults = parseImport(reader.result as string)
      if (!window.confirm('Vorhandene Ergebnisse ersetzen?')) return
      store.importResults(newResults)
    } catch (e) {
      importError.value = e instanceof Error ? e.message : 'Fehler beim Importieren.'
    } finally {
      if (fileInput.value) fileInput.value.value = ''
    }
  }
  reader.readAsText(file)
}

function handleReset(): void {
  if (!window.confirm('Alle eingegebenen Ergebnisse löschen?')) return
  store.reset()
}
</script>

<template>
  <main class="settings-view">
    <h1>Einstellungen</h1>

    <section class="settings-view__section">
      <h2>Daten</h2>

      <div class="settings-view__actions">
        <button type="button" class="settings-view__btn" @click="handleExport">
          Exportieren
        </button>
        <button type="button" class="settings-view__btn" @click="handleImportClick">
          Importieren
        </button>
        <button
          type="button"
          class="settings-view__btn settings-view__btn--danger"
          @click="handleReset"
        >
          Zurücksetzen
        </button>
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
  </main>
</template>

<style scoped>
.settings-view {
  padding: var(--space-5) var(--space-4);
  max-width: 40rem;
  margin-inline: auto;
}

h1 {
  margin-block-end: var(--space-6);
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

.settings-view__btn {
  padding: var(--space-3) var(--space-5);
  min-height: var(--tap-target);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: 600;
  cursor: pointer;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-family: inherit;
}

.settings-view__btn:hover {
  background: var(--color-bg);
}

.settings-view__error {
  color: var(--color-loss);
  margin: 0;
  font-size: var(--font-size-sm);
}

.settings-view__btn--danger {
  border-color: var(--color-loss);
  color: var(--color-loss);
}

.settings-view__btn--danger:hover {
  background: color-mix(in srgb, var(--color-loss) 10%, transparent);
}
</style>
