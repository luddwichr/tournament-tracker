<script setup lang="ts">
import { ref, useId, useTemplateRef } from 'vue'

// Shared header cell for the stat tables (group standings, third-place,
// team stats). The visible label stays abbreviated so the table keeps fitting
// on a phone without horizontal scrolling; the full word is one tap away.
//
// Pass `abbr` for the text variant, or provide the default slot for a visual
// (e.g. a card icon) instead.
defineProps<{ label: string; abbr?: string }>()

const tooltipId = useId()
const trigger = useTemplateRef<HTMLButtonElement>('trigger')

// The popover lives in the top layer, so it escapes the table wrapper's
// overflow-x clipping — but the top layer is also why it can't inherit the
// cell's position. Anchor positioning would do this in CSS, so drop this and
// the beforetoggle handler once its browser support is broad enough.
const position = ref<{ top: string; left?: string; right?: string }>({ left: '0px', top: '0px' })

function placeTooltip(): void {
  const rect = trigger.value?.getBoundingClientRect()
  if (!rect) return
  const top = `${rect.bottom + 4}px`
  // Grow the tooltip away from the nearer viewport edge — left-half cells
  // anchor their left edge, right-half cells their right edge — so it can
  // never be clipped. Centring on the cell would need the tooltip's width,
  // which is unavailable while the popover is still display:none.
  position.value =
    rect.left + rect.width / 2 < globalThis.innerWidth / 2
      ? { left: `${rect.left}px`, top }
      : { right: `${globalThis.innerWidth - rect.right}px`, top }
}
</script>

<template>
  <th scope="col">
    <!-- The accessible name is the full label: screen readers get "Spiele",
         never "Sp". Sighted users tap for the same word, since touch devices
         have no hover to fire an <abbr title>. -->
    <button ref="trigger" type="button" class="stat-header__trigger" :aria-label="label" :popovertarget="tooltipId">
      <abbr v-if="abbr">{{ abbr }}</abbr>
      <slot v-else />
    </button>
    <span
      :id="tooltipId"
      class="stat-header__tooltip"
      popover
      role="tooltip"
      :style="position"
      @beforetoggle="placeTooltip"
    >
      {{ label }}
    </span>
  </th>
</template>

<style scoped>
.stat-header__trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  /* Deliberately below --tap-target: these are supplementary hints in a table
     that has to stay readable at 390px, not primary controls. */
  min-height: 1.75rem;
  padding: 0;
  border: none;
  background: none;
  color: inherit;
  font: inherit;
  cursor: help;
}

.stat-header__trigger abbr {
  text-decoration: underline dotted;
  text-underline-offset: 2px;
}

/* top plus one of left/right come from placeTooltip() as an inline binding.
   `inset: auto` is load-bearing: the UA sheet gives [popover] `inset: 0`, so
   without it the leftover `left: 0` beats the inline `right` and every
   tooltip pins itself to the viewport's left edge. */
.stat-header__tooltip {
  position: fixed;
  inset: auto;
  margin: 0;
  max-width: calc(100vw - 2 * var(--space-2));
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--elevation-2);
  font-size: var(--font-size-sm);
  font-weight: normal;
  white-space: nowrap;
}
</style>
