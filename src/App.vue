<script setup lang="ts">
import { ref, watch, watchEffect, nextTick, provide, useTemplateRef, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import UpdateDialog from './components/UpdateDialog.vue'
import { announceKey } from './composables/use-announce'
import { provideTeamViewer } from './composables/use-team-viewer'
import { provideScoreDialog } from './composables/use-score-dialog'
import { useSettingsStore } from './stores/settings'

// Loaded lazily: TeamDialog pulls in the squads dataset and flag-icons CSS
// (see main.ts), which must not ride the entry chunk. It only renders under
// v-if, so the async gap is invisible.
const TeamDialog = defineAsyncComponent(() => import('./components/TeamDialog.vue'))

// Loaded lazily for the same reason: ScoreDialog pulls in use-match-result-form,
// which pulls in the ESPN live-sync provider and the full fixtures/teams data —
// none of that belongs in the entry chunk that every route pays for upfront.
const ScoreDialog = defineAsyncComponent(() => import('./components/ScoreDialog.vue'))

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
const { config: scoreDialogConfig, close: closeScoreDialog } = provideScoreDialog()

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

  <UpdateDialog />

  <TeamDialog v-if="viewedTeam" :team="viewedTeam" @close="closeTeamView" />
  <ScoreDialog
    v-if="scoreDialogConfig"
    :match="scoreDialogConfig.match"
    :home-team="scoreDialogConfig.home"
    :away-team="scoreDialogConfig.away"
    @close="closeScoreDialog"
  />
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
