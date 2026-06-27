<script setup lang="ts">
import AppNav from './AppNav.vue'
</script>

<template>
  <header class="app-header">
    <div class="app-header__bar">
      <p class="app-header__title">⚽ WM 2026 Tracker</p>
    </div>
    <AppNav />
  </header>
</template>

<style scoped>
.app-header {
  background-color: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.app-header__bar {
  display: flex;
  align-items: center;
  padding: var(--space-3) var(--space-4);
}

.app-header__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: 700;
}
</style>
