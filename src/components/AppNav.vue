<script setup lang="ts">
import { useRouter } from 'vue-router'

const links = useRouter()
  .getRoutes()
  .filter((r) => r.meta.navIcon)
</script>

<template>
  <nav class="app-nav" aria-label="Hauptnavigation">
    <ul class="app-nav__list">
      <li v-for="link in links" :key="link.path" class="app-nav__item">
        <RouterLink class="app-nav__link" :to="link.path">
          <span class="app-nav__icon" aria-hidden="true">{{ link.meta.navIcon }}</span>
          <span class="app-nav__label">{{ link.meta.title }}</span>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.app-nav__list {
  display: flex;
  gap: var(--space-1);
  margin: 0;
  padding: 0 var(--space-2) var(--space-2);
  list-style: none;
}

.app-nav__item {
  flex: 1;
}

.app-nav__link {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  min-height: var(--tap-target);
  padding: var(--space-2);
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  font-weight: 600;
  background-color: var(--color-bg);
}

.app-nav__icon {
  font-size: var(--font-size-lg);
}

.app-nav__link.router-link-active {
  color: var(--color-primary);
  background-color: color-mix(in srgb, var(--color-primary) 12%, transparent);
}

@media (min-width: 640px) {
  .app-nav__list {
    justify-content: flex-start;
    gap: var(--space-2);
  }

  .app-nav__item {
    flex: 0 0 auto;
  }

  .app-nav__link {
    flex-direction: row;
  }
}
</style>
