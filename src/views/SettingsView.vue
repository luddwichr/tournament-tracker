<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Result } from '../types/tournament'
import { useTournamentStore } from '../stores/tournament'
import { useSettingsStore } from '../stores/settings'
import type { Theme } from '../stores/settings'
import { exportJson, parseImport } from '../lib/persistence'
import ConfirmDialog from '../components/ConfirmDialog.vue'

const store = useTournamentStore()
const settings = useSettingsStore()

const themes: { value: Theme; label: string; icon: string }[] = [
  { value: 'light', label: 'Hell', icon: '☀️' },
  { value: 'dark', label: 'Dunkel', icon: '🌙' },
]
type PendingAction = { kind: 'reset' } | { kind: 'import'; results: Record<string, Result> }

const fileInput = ref<HTMLInputElement | null>(null)
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
  reader.readAsText(file)
}

function handleReset(): void {
  pending.value = { kind: 'reset' }
}

function handleConfirm(): void {
  if (pending.value?.kind === 'import') {
    store.importResults(pending.value.results)
  } else if (pending.value?.kind === 'reset') {
    store.reset()
  }
  pending.value = null
}

function handleCancel(): void {
  pending.value = null
}
</script>

<template>
  <main class="settings-view">
    <h1>Einstellungen</h1>

    <div class="settings-view__sections">
      <section class="settings-view__section">
        <h2>Erscheinungsbild</h2>

        <fieldset class="settings-view__theme-picker">
          <legend class="visually-hidden">Design</legend>
          <div class="settings-view__theme-options" role="group">
            <label
              v-for="t in themes"
              :key="t.value"
              class="settings-view__theme-option"
              :class="{ 'settings-view__theme-option--active': settings.theme === t.value }"
            >
              <input v-model="settings.theme" type="radio" name="theme" :value="t.value" class="visually-hidden" />
              <span aria-hidden="true">{{ t.icon }}</span>
              {{ t.label }}
            </label>
          </div>
        </fieldset>
      </section>

      <section class="settings-view__section">
        <h2>Daten</h2>

        <div class="settings-view__actions">
          <button type="button" class="settings-view__btn" @click="handleExport">Exportieren</button>
          <button type="button" class="settings-view__btn" @click="handleImportClick">Importieren</button>
          <button type="button" class="settings-view__btn btn--danger" @click="handleReset">Zurücksetzen</button>
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
  </main>

  <ConfirmDialog
    v-if="confirmConfig"
    :title="confirmConfig.title"
    :message="confirmConfig.message"
    :confirm-label="confirmConfig.confirmLabel"
    @confirm="handleConfirm"
    @cancel="handleCancel"
  />
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

.settings-view__theme-picker {
  border: none;
  padding: 0;
  margin: 0;
}

.settings-view__theme-options {
  display: flex;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.settings-view__theme-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: var(--tap-target);
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-base);
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  border-inline-end: 2px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  transition:
    background var(--motion-duration-base) var(--motion-easing-standard),
    color var(--motion-duration-base) var(--motion-easing-standard);
}

.settings-view__theme-option:last-child {
  border-inline-end: none;
}

.settings-view__theme-option--active {
  background: var(--color-primary);
  color: var(--color-primary-contrast);
}

.settings-view__theme-option:has(:focus-visible) {
  outline: 3px solid var(--color-focus);
  outline-offset: -3px;
}

.settings-view__theme-option:hover:not(.settings-view__theme-option--active) {
  background: var(--color-bg);
  color: var(--color-text);
}
</style>
