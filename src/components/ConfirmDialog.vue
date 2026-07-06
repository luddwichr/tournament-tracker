<script setup lang="ts">
import { ref, useId, useTemplateRef } from 'vue'
import BaseDialog from './BaseDialog.vue'

defineProps<{
  title: string
  message: string
  confirmLabel?: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const baseDialog = useTemplateRef<InstanceType<typeof BaseDialog>>('baseDialog')
const descId = useId()
const wasConfirmed = ref(false)

function handleConfirm(): void {
  wasConfirmed.value = true
  baseDialog.value?.close()
}

function handleCancel(): void {
  baseDialog.value?.close()
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
  <BaseDialog
    ref="baseDialog"
    :title="title"
    :aria-describedby="descId"
    max-width="var(--dialog-width-sm)"
    :show-close-button="false"
    @close="handleClose"
  >
    <p :id="descId" class="confirm-dialog__message">
      {{ message }}
    </p>

    <template #footer>
      <button type="button" class="btn btn--secondary" @click="handleCancel">Abbrechen</button>
      <button type="button" class="btn btn--danger" @click="handleConfirm">
        {{ confirmLabel ?? 'Bestätigen' }}
      </button>
    </template>
  </BaseDialog>
</template>

<style scoped>
.confirm-dialog__message {
  margin: 0;
  padding: var(--space-4);
  line-height: 1.5;
  color: var(--color-text-muted);
  white-space: pre-line;
}
</style>
