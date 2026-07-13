import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useTournamentStore } from './stores/tournament'
import { isGroupStageComplete } from './lib/standings'

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
    path: '/groups',
    name: 'groups',
    component: () => import('./views/GroupsView.vue'),
    meta: { title: 'Gruppen' },
  },
  {
    path: '/knockout',
    name: 'knockout',
    component: () => import('./views/KnockoutView.vue'),
    meta: { title: 'K.-o.-Runde' },
  },
  {
    path: '/ranking',
    name: 'ranking',
    component: () => import('./views/RankingView.vue'),
    meta: { title: 'Weltrangliste' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('./views/SettingsView.vue'),
    meta: { title: 'Einstellungen' },
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Keep the browser tab title in sync with the active route.
router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · ${APP_NAME}` : APP_NAME
})
