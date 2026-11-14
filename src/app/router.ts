import { type RouteRecordRaw, type RouterScrollBehavior, createRouter, createWebHistory } from 'vue-router'
import { isGroupStageComplete } from '../lib/standings'
import { useTournamentStore } from '../stores/tournament'

const APP_NAME = 'WM 2026 Tracker'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: () => {
      const { results } = useTournamentStore()
      return isGroupStageComplete(results) ? '/knockout' : '/groups'
    },
  },
  {
    component: () => import('../views/GroupsView.vue'),
    meta: { title: 'Gruppen' },
    name: 'groups',
    path: '/groups',
  },
  {
    component: () => import('../views/KnockoutView.vue'),
    meta: { title: 'K.-o.-Runde' },
    name: 'knockout',
    path: '/knockout',
  },
  {
    component: () => import('../views/RankingView.vue'),
    meta: { title: 'Weltrangliste' },
    name: 'ranking',
    path: '/ranking',
  },
  {
    component: () => import('../views/SettingsView.vue'),
    meta: { title: 'Einstellungen' },
    name: 'settings',
    path: '/settings',
  },
]

/**
 * Back and forward return to where the page was left, and a fresh navigation starts at the top.
 * A hash, as from the skip link, scrolls to its target.
 * This is the only scroll on navigation, because App.vue moves focus to the main landmark with preventScroll.
 */
export const scrollBehavior: RouterScrollBehavior = (to, _from, savedPosition) => {
  if (savedPosition) return savedPosition
  if (to.hash) return { el: to.hash }
  return { top: 0 }
}

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  // vue-router 5.5 deprecates this for ScrollRestoration, which so far only ships from vue-router/experimental.
  // The stable option keeps working throughout 5.x, so it stays until the replacement leaves experimental.
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  scrollBehavior,
})

// Keep the browser tab title in sync with the active route.
router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · ${APP_NAME}` : APP_NAME
})
