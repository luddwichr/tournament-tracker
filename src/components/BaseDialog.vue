<script setup lang="ts">
import { ref, onMounted, useId } from 'vue'
import { useScrollLock } from '../composables/use-scroll-lock'

withDefaults(defineProps<{
  title?: string
  ariaLabel?: string
  ariaDescribedby?: string
  maxWidth?: string
  maxHeight?: string
  showCloseButton?: boolean
}>(), {
  showCloseButton: true,
})

const emit = defineEmits<{ close: [] }>()
const dialogEl = ref<HTMLDialogElement | null>(null)
const titleId = useId()

useScrollLock()

onMounted(() => {
  dialogEl.value?.showModal()
})

function close(): void {
  dialogEl.value?.close()
}

defineExpose({ close })
</script>

<template>
  <dialog
    ref="dialogEl"
    class="base-dialog"
    :class="{ 'base-dialog--scrollable': !!maxHeight }"
    :style="{
      '--dialog-max-width': maxWidth ?? 'min(90vw, 28rem)',
      ...(maxHeight ? { '--dialog-max-height': maxHeight } : {}),
    }"
    :aria-label="ariaLabel"
    :aria-labelledby="!ariaLabel && title ? titleId : undefined"
    :aria-describedby="ariaDescribedby"
    aria-modal="true"
    @close="emit('close')"
  >
    <div class="base-dialog__inner">
      <header class="base-dialog__header">
        <slot name="title">
          <h2
            :id="titleId"
            class="base-dialog__title"
          >
            {{ title }}
          </h2>
        </slot>
        <button
          v-if="showCloseButton"
          type="button"
          class="base-dialog__close"
          aria-label="Schließen"
          @click="close()"
        >
          ✕
        </button>
      </header>

      <div
        class="base-dialog__body"
        :tabindex="maxHeight ? 0 : undefined"
      >
        <slot />
      </div>

      <footer
        v-if="$slots['footer']"
        class="base-dialog__footer"
      >
        <slot name="footer" />
      </footer>
    </div>
  </dialog>
</template>

<style scoped>
.base-dialog {
  border: none;
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  color: var(--color-text);
  padding: 0;
  max-width: var(--dialog-max-width, min(90vw, 28rem));
  width: 100%;
  box-shadow: var(--shadow-lg);
}

.base-dialog::backdrop {
  background: var(--color-scrim);
}

.base-dialog__inner {
  display: flex;
  flex-direction: column;
}

.base-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.base-dialog__title {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 700;
  line-height: 1.2;
}

.base-dialog__close {
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

.base-dialog__close:hover {
  color: var(--color-text);
  background: var(--color-bg);
}

.base-dialog__footer {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  justify-content: flex-end;
  padding: var(--space-3) var(--space-4) var(--space-4);
  border-top: 1px solid var(--color-border);
}

.base-dialog--scrollable {
  display: flex;
  flex-direction: column;
  max-height: var(--dialog-max-height);
}

.base-dialog--scrollable .base-dialog__inner {
  overflow: hidden;
  height: 100%;
}

.base-dialog--scrollable .base-dialog__body {
  overflow-y: auto;
  overscroll-behavior: contain;
  flex: 1;
}
</style>
