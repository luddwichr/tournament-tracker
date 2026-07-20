<script setup lang="ts">
import { ref, useTemplateRef, watch } from 'vue'
import AppNav from './AppNav.vue'
import { useRoute } from 'vue-router'

const isNavOpen = ref(false)
const route = useRoute()
const burgerBtn = useTemplateRef<HTMLButtonElement>('burgerBtn')

watch(
  () => route.path,
  () => {
    isNavOpen.value = false
  },
)

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && isNavOpen.value) {
    isNavOpen.value = false
    burgerBtn.value?.focus()
  }
}
</script>

<template>
  <!-- eslint-disable-next-line vuejs-accessibility/no-static-element-interactions -- keydown delegation to catch Escape while focus is anywhere within the header/nav, see REVIEW.md §6 -->
  <header class="app-header" @keydown="handleKeydown">
    <div class="app-header__bar">
      <p class="app-header__title"><span class="app-header__ball" aria-hidden="true">⚽</span> WM 2026 Tracker</p>
      <button
        ref="burgerBtn"
        class="app-header__burger"
        type="button"
        :aria-expanded="isNavOpen"
        aria-controls="app-nav-list"
        aria-label="Navigation öffnen"
        @click="isNavOpen = !isNavOpen"
      >
        <span class="app-header__burger-icon" aria-hidden="true">
          <span class="app-header__burger-line" />
          <span class="app-header__burger-line" />
          <span class="app-header__burger-line" />
        </span>
      </button>
    </div>
    <AppNav :open="isNavOpen" />
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: var(--z-overlay);
  background-color: var(--color-surface);
  box-shadow: var(--elevation-1);
}

.app-header__bar {
  display: flex;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  /* Sticky bar sits under the notch/Dynamic Island once viewport-fit=cover is
     set, so grow the top and side padding by whatever the device reserves. */
  padding-top: calc(var(--space-3) + env(safe-area-inset-top));
  padding-inline-start: calc(var(--space-4) + env(safe-area-inset-left));
  padding-inline-end: calc(var(--space-4) + env(safe-area-inset-right));
}

.app-header__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.app-header__ball {
  display: inline-block;
  animation: app-header-ball-spin 2.4s linear infinite;
}

@keyframes app-header-ball-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-header__ball {
    animation: none;
  }
}

.app-header__burger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--tap-target);
  height: var(--tap-target);
  margin-inline-start: auto;
  padding: var(--space-2);
  border: none;
  border-radius: var(--radius-md);
  background: none;
  color: var(--color-text);
  cursor: pointer;
}

.app-header__burger:hover {
  background-color: color-mix(in srgb, var(--color-text) var(--state-hover), transparent);
}

.app-header__burger-icon {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 20px;
}

/* The glyph's dimensions are drawing geometry, not scale steps — the radius is
   half the line height to round the caps, so it tracks `height` rather than
   --radius-*. Deliberately literal. */
.app-header__burger-line {
  display: block;
  height: 2px;
  background: currentColor;
  border-radius: 2px;
}

@media (min-width: 640px) {
  .app-header__burger {
    display: none;
  }
}
</style>
