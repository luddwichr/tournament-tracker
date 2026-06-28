import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const APP_NAME = 'WM 2026 Tracker'

declare module 'vue-router' {
  interface RouteMeta {
    /** Page title — drives both the document title and the a11y announcement. */
    title?: string
  }
}

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/groups' },
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
