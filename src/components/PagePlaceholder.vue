<script setup lang="ts">
// Temporary scaffold placeholder for views whose real content arrives in later
// milestones. Each milestone replaces the corresponding view's usage with the
// actual feature.
defineProps<{
  title: string
  hint: string
}>()
</script>

<template>
  <section class="placeholder">
    <h1 class="placeholder__title">{{ title }}</h1>
    <p class="placeholder__hint">{{ hint }}</p>
  </section>
</template>

<style scoped>
.placeholder__title {
  margin: 0 0 var(--space-3);
  font-size: var(--font-size-xl);
}

.placeholder__hint {
  margin: 0;
  color: var(--color-text-muted);
}
</style>
