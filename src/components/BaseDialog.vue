<script setup lang="ts">
import { computed, onMounted, useId, useTemplateRef } from 'vue'
import { useScrollLock } from '../composables/use-scroll-lock'

// Vue's macro types mark boolean props as always-defined, since an absent prop casts to false.
// So typescript-eslint thinks this default is useless.
// It is in fact the runtime default that makes an omitted prop mean `true`.
const {
  maxWidth,
  maxHeight,
  // eslint-disable-next-line @typescript-eslint/no-useless-default-assignment
  showCloseButton = true,
} = defineProps<{
  title?: string
  ariaLabel?: string
  ariaDescribedby?: string
  maxWidth?: string
  maxHeight?: string
  showCloseButton?: boolean
}>()

const emit = defineEmits<{ close: [] }>()
const dialogEl = useTemplateRef<HTMLDialogElement>('dialogEl')
const titleId = useId()

// maxHeight only drives its custom property when set, so the scrollable
// layout (keyed off `--dialog-max-height`) stays off by default.
const dialogStyle = computed(() => ({
  '--dialog-max-width': maxWidth ?? 'var(--dialog-width-sm)',
  ...(maxHeight ? { '--dialog-max-height': maxHeight } : {}),
}))

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
    :style="dialogStyle"
    :aria-label="ariaLabel"
    :aria-labelledby="!ariaLabel && title ? titleId : undefined"
    :aria-describedby="ariaDescribedby"
    @close="emit('close')"
  >
    <div class="base-dialog__inner">
      <header class="base-dialog__header">
        <slot name="title">
          <h2 :id="titleId" class="base-dialog__title">
            {{ title }}
          </h2>
        </slot>
        <button v-if="showCloseButton" type="button" class="base-dialog__close" aria-label="Schließen" @click="close()">
          ✕
        </button>
      </header>

      <div class="base-dialog__body" :tabindex="maxHeight ? 0 : undefined">
        <slot />
      </div>

      <footer v-if="$slots['footer']" class="base-dialog__footer">
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
  max-width: var(--dialog-max-width, var(--dialog-width-sm));
  width: 100%;
  box-shadow: var(--elevation-3);
  transition:
    opacity var(--motion-duration-base) var(--motion-easing-standard),
    scale var(--motion-duration-base) var(--motion-easing-standard);
  opacity: 1;
  scale: 1;
}

/*
 * Entry animation only, where the dialog fades and scales in from @starting-style.
 *
 * There is deliberately no matching `:not([open])` exit state. It would need
 * `display`/`overlay` with allow-discrete to keep the element in the top layer
 * while it animates out, and jsdom's showModal() never sets the `open`
 * attribute, so that selector matches permanently under test and renders every
 * dialog's content invisible to isVisible() assertions. The open animation is
 * the part users actually notice.
 */
@starting-style {
  .base-dialog[open] {
    opacity: 0;
    scale: 0.95;
  }
}

.base-dialog::backdrop {
  background: var(--color-scrim);
  transition: opacity var(--motion-duration-base) var(--motion-easing-standard);
  opacity: 1;
}

@starting-style {
  .base-dialog[open]::backdrop {
    opacity: 0;
  }
}

/* reset.css already collapses the durations under reduced motion; the scale
   start is neutralised here so no movement is implied at all. */
@media (prefers-reduced-motion: reduce) {
  @starting-style {
    .base-dialog[open] {
      scale: 1;
    }
  }
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
  font-weight: var(--font-weight-bold);
  line-height: 1.2;
}

.base-dialog__close {
  background: var(--color-bg);
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
  flex-wrap: wrap;
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
