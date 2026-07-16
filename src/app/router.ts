import { type RouteRecordRaw, createRouter, createWebHistory } from 'vue-router'
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

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Keep the browser tab title in sync with the active route.
router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · ${APP_NAME}` : APP_NAME
})
