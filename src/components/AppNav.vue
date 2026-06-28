<script setup lang="ts">
interface NavLink {
  to: string
  label: string
  icon: string
}

const links: NavLink[] = [
  { to: '/groups', label: 'Gruppen', icon: '🏟️' },
  { to: '/knockout', label: 'K.-o.-Runde', icon: '🏆' },
  { to: '/settings', label: 'Einstellungen', icon: '⚙️' },
]
</script>

<template>
  <nav class="app-nav" aria-label="Hauptnavigation">
    <ul class="app-nav__list">
      <li v-for="link in links" :key="link.to" class="app-nav__item">
        <RouterLink class="app-nav__link" :to="link.to">
          <span class="app-nav__icon" aria-hidden="true">{{ link.icon }}</span>
          <span class="app-nav__label">{{ link.label }}</span>
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
