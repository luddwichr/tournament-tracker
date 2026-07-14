<script setup lang="ts">
import BaseDialog from './BaseDialog.vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { useTemplateRef } from 'vue'

const { needRefresh, updateServiceWorker } = useRegisterSW()

const baseDialog = useTemplateRef<InstanceType<typeof BaseDialog>>('baseDialog')

function reload(): void {
  void updateServiceWorker()
}

function close(): void {
  baseDialog.value?.close()
}

function handleClose(): void {
  needRefresh.value = false
}
</script>

<template>
  <BaseDialog
    v-if="needRefresh"
    ref="baseDialog"
    title="Update verfügbar"
    :show-close-button="false"
    @close="handleClose"
  >
    <p class="update-dialog__message">Eine neue Version von WM 2026 Tracker steht bereit.</p>

    <template #footer>
      <button type="button" class="btn btn--secondary" @click="close">Später</button>
      <button type="button" class="btn btn--primary" @click="reload">Aktualisieren</button>
    </template>
  </BaseDialog>
</template>

<style scoped>
.update-dialog__message {
  margin: 0;
  padding: var(--space-4);
  line-height: 1.5;
  color: var(--color-text-muted);
}
</style>
