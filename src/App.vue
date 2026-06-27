<script setup lang="ts">
import { ref, watch, nextTick, provide } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import { announceKey } from './composables/use-announce'

const route = useRoute()
const mainRef = ref<HTMLElement | null>(null)
const announcement = ref('')

function announce(msg: string): void {
  // Clear then set on next tick so the same message can be re-announced.
  announcement.value = ''
  nextTick(() => {
    announcement.value = msg
  })
}

provide(announceKey, announce)

// On route change, move focus to the main landmark and announce the new page
// so keyboard and screen-reader users are oriented.
watch(
  () => route.fullPath,
  () => {
    const title = route.meta.title ?? ''
    announce(title ? `Seite: ${title}` : '')
    mainRef.value?.focus()
  },
)
</script>

<template>
  <a class="skip-link" href="#main">Zum Inhalt springen</a>
  <AppHeader />
  <main id="main" ref="mainRef" class="app-main" tabindex="-1">
    <RouterView />
  </main>
  <div class="visually-hidden" role="status" aria-live="polite">{{ announcement }}</div>
</template>

<style scoped>
.app-main {
  padding: var(--space-4);
}

.app-main:focus {
  outline: none;
}

@media (min-width: 640px) {
  .app-main {
    padding: var(--space-5);
  }
}
</style>
