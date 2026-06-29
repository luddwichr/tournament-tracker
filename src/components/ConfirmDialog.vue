<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useScrollLock } from '../composables/use-scroll-lock'

defineProps<{
  title: string
  message: string
  confirmLabel?: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const dialogEl = ref<HTMLDialogElement | null>(null)
const wasConfirmed = ref(false)

useScrollLock()

onMounted(() => {
  dialogEl.value?.showModal()
})

function handleConfirm(): void {
  wasConfirmed.value = true
  dialogEl.value?.close()
}

function handleCancel(): void {
  dialogEl.value?.close()
}

function handleClose(): void {
  if (wasConfirmed.value) {
    emit('confirm')
  } else {
    emit('cancel')
  }
}
</script>

<template>
  <dialog
    ref="dialogEl"
    class="confirm-dialog"
    aria-labelledby="confirm-dialog-title"
    aria-describedby="confirm-dialog-desc"
    @close="handleClose"
  >
    <div class="confirm-dialog__inner">
      <header class="confirm-dialog__header">
        <h2
          id="confirm-dialog-title"
          class="confirm-dialog__title"
        >
          {{ title }}
        </h2>
      </header>
      <div class="confirm-dialog__body">
        <p
          id="confirm-dialog-desc"
          class="confirm-dialog__message"
        >
          {{ message }}
        </p>
      </div>
      <footer class="confirm-dialog__footer">
        <button
          type="button"
          class="btn btn--secondary"
          @click="handleCancel"
        >
          Abbrechen
        </button>
        <button
          type="button"
          class="btn btn--danger"
          @click="handleConfirm"
        >
          {{ confirmLabel ?? 'Bestätigen' }}
        </button>
      </footer>
    </div>
  </dialog>
</template>

<style scoped>
.confirm-dialog {
  border: none;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text);
  padding: 0;
  max-width: min(90vw, 24rem);
  width: 100%;
  box-shadow: var(--shadow-lg);
}

.confirm-dialog::backdrop {
  background: var(--color-scrim);
}

.confirm-dialog__inner {
  display: flex;
  flex-direction: column;
}

.confirm-dialog__header {
  padding: var(--space-4) var(--space-4) var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.confirm-dialog__title {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 700;
  line-height: 1.2;
}

.confirm-dialog__body {
  padding: var(--space-4);
}

.confirm-dialog__message {
  margin: 0;
  line-height: 1.5;
  color: var(--color-text-muted);
}

.confirm-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4) var(--space-4);
  border-top: 1px solid var(--color-border);
}
</style>
