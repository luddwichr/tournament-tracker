<script setup lang="ts">
defineProps<{ open?: boolean }>()

const links = [
  { icon: '🏟️', label: 'Gruppen', path: '/groups' },
  { icon: '🏆', label: 'K.-o.-Runde', path: '/knockout' },
  { icon: '🌍', label: 'Weltrangliste', path: '/ranking' },
  { icon: '⚙️', label: 'Einstellungen', path: '/settings' },
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

<style scoped lang="scss">
@use '../styles/breakpoints' as bp;

.app-nav__list {
  display: none;
  margin: 0;
  padding: 0 var(--space-2) var(--space-2);
  list-style: none;
  flex-direction: column;
  gap: var(--space-1);
  /* `display` only participates in a transition with allow-discrete, which is
     what lets the fade and slide run while the menu flips none ↔ flex. */
  opacity: 0;
  translate: 0 calc(-1 * var(--space-2));
  transition:
    opacity var(--motion-duration-base) var(--motion-easing-standard),
    translate var(--motion-duration-base) var(--motion-easing-standard),
    display var(--motion-duration-base) allow-discrete;
}

.app-nav__list--open {
  display: flex;
  opacity: 1;
  translate: 0 0;

  @starting-style {
    opacity: 0;
    translate: 0 calc(-1 * var(--space-2));
  }
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

@media (min-width: bp.$nav-expanded) {
  /* Always-visible inline row here, so the collapsed state's hidden opacity and offset must be reset.
     Otherwise the nav is laid out but invisible. */
  .app-nav__list {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    gap: var(--space-2);
    opacity: 1;
    translate: 0 0;
  }

  .app-nav__item {
    flex: 0 0 auto;
  }
}
</style>
