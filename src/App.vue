<script setup lang="ts">
import { ref, watch, watchEffect, nextTick, provide, useTemplateRef } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import TeamDialog from './components/TeamDialog.vue'
import { announceKey } from './composables/use-announce'
import { provideTeamViewer } from './composables/use-team-viewer'
import { useSettingsStore } from './stores/settings'
import { squads } from './data/squads'

const settings = useSettingsStore()
watchEffect(() => {
  document.documentElement.dataset['theme'] = settings.theme
})

const route = useRoute()
const mainRef = useTemplateRef<HTMLElement>('mainRef')
const announcement = ref('')

function announce(msg: string): void {
  // Clear then set on next tick so the same message can be re-announced.
  announcement.value = ''
  nextTick(() => {
    announcement.value = msg
  })
}

provide(announceKey, announce)

const { team: viewedTeam, close: closeTeamView } = provideTeamViewer()

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
  <div class="visually-hidden" role="status" aria-live="polite">
    {{ announcement }}
  </div>

  <TeamDialog v-if="viewedTeam" :team="viewedTeam" :players="squads[viewedTeam.id] ?? []" @close="closeTeamView" />
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
