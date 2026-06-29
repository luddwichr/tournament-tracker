<script setup lang="ts">
import { useRouter } from 'vue-router'

defineProps<{ open?: boolean }>()

const links = useRouter()
  .getRoutes()
  .filter((r) => r.meta.navIcon)
</script>

<template>
  <nav class="app-nav" aria-label="Hauptnavigation">
    <ul id="app-nav-list" class="app-nav__list" :class="{ 'app-nav__list--open': open }">
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
  display: none;
  margin: 0;
  padding: 0 var(--space-2) var(--space-2);
  list-style: none;
  flex-direction: column;
  gap: var(--space-1);
}

.app-nav__list--open {
  display: flex;
}

.app-nav__item {
  flex: 1;
}

.app-nav__link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--tap-target);
  padding: var(--space-2) var(--space-3);
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
  background-color: color-mix(in srgb, var(--color-primary) var(--state-focus), transparent);
}

@media (min-width: 640px) {
  .app-nav__list {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    gap: var(--space-2);
  }

  .app-nav__item {
    flex: 0 0 auto;
  }
}
</style>
