<script setup lang="ts">
defineProps<{ open?: boolean }>()

const links = [
  { path: '/groups', icon: '🏟️', label: 'Gruppen' },
  { path: '/knockout', icon: '🏆', label: 'K.-o.-Runde' },
  { path: '/ranking', icon: '🌍', label: 'Weltrangliste' },
  { path: '/settings', icon: '⚙️', label: 'Einstellungen' },
]
</script>

<template>
  <nav class="app-nav" aria-label="Hauptnavigation">
    <ul id="app-nav-list" class="app-nav__list" :class="{ 'app-nav__list--open': open }">
      <li v-for="link in links" :key="link.path" class="app-nav__item">
        <RouterLink class="app-nav__link" :to="link.path">
          <span class="app-nav__icon" aria-hidden="true">{{ link.icon }}</span>
          <span class="app-nav__label">{{ link.label }}</span>
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
  font-weight: var(--font-weight-semibold);
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
