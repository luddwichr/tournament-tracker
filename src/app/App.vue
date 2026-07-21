<script setup lang="ts">
import { defineAsyncComponent, useTemplateRef, watch, watchEffect } from 'vue'
import AppHeader from '../components/AppHeader.vue'
import UpdateDialog from '../components/UpdateDialog.vue'
import { provideAnnounce } from '../composables/use-announce'
import { provideScoreDialog } from '../composables/use-score-dialog'
import { provideTeamViewer } from '../composables/use-team-viewer'
import { useRoute } from 'vue-router'
import { useSettingsStore } from '../stores/settings'

// Loaded lazily: TeamDialog pulls in the squads dataset and flag-icons CSS
// (see main.ts), which must not ride the entry chunk. It only renders under
// v-if, so the async gap is invisible.
const TeamDialog = defineAsyncComponent(() => import('../components/TeamDialog.vue'))

// Loaded lazily for the same reason: ScoreDialog pulls in use-match-result-form,
// which pulls in the ESPN live-sync provider and the full fixtures and teams data.
// None of that belongs in the entry chunk that every route pays for upfront.
const ScoreDialog = defineAsyncComponent(() => import('../components/ScoreDialog.vue'))

const settings = useSettingsStore()
watchEffect(() => {
  // The initial application happens before first paint in public/theme-boot.js
  // (which must stay in sync with this block); this watcher owns every later
  // change, i.e. the user picking a theme in Einstellungen.
  //
  // 'system' means no explicit user choice, so remove the attribute.
  // That lets the unscoped `@media (prefers-color-scheme: dark)` block in tokens.css apply based on the OS preference.
  // Otherwise the `[data-theme='light']` block would override it.
  if (settings.theme === 'system') {
    delete document.documentElement.dataset['theme']
  } else {
    document.documentElement.dataset['theme'] = settings.theme
  }

  // Keep the OS browser chrome on the app's actual background colour. Reading
  // the resolved token covers 'system' without re-deriving the media query.
  const meta = document.querySelector('meta[name="theme-color"]')
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim()
  if (meta && bg) meta.setAttribute('content', bg)
})

const route = useRoute()
const mainRef = useTemplateRef<HTMLElement>('mainRef')

const { announce, announcement } = provideAnnounce()
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
  <div class="visually-hidden" role="status">
    {{ announcement }}
  </div>

  <UpdateDialog />

  <TeamDialog v-if="viewedTeam" :team="viewedTeam" @close="closeTeamView" />
  <ScoreDialog v-if="scoreDialogConfig" v-bind="scoreDialogConfig" @close="closeScoreDialog" />
</template>

<style scoped lang="scss">
@use '../styles/breakpoints' as bp;

.app-main {
  padding: var(--space-4);
  /* Keep the last row of content clear of the home indicator and the rounded
     display corners in the installed PWA (viewport-fit=cover, see index.html). */
  padding-bottom: max(var(--space-4), env(safe-area-inset-bottom));
  padding-inline-start: max(var(--space-4), env(safe-area-inset-left));
  padding-inline-end: max(var(--space-4), env(safe-area-inset-right));
}

.app-main:focus {
  outline: none;
}

@media (min-width: bp.$nav-expanded) {
  .app-main {
    padding: var(--space-5);
    padding-bottom: max(var(--space-5), env(safe-area-inset-bottom));
    padding-inline-start: max(var(--space-5), env(safe-area-inset-left));
    padding-inline-end: max(var(--space-5), env(safe-area-inset-right));
  }
}
</style>
