# Vue + Vue Router + Pinia

Pinned (exact) at scaffold time (2026-06-26):

| Package                       | Version  |
| ----------------------------- | -------- |
| `vue`                         | `3.5.39` |
| `vue-router`                  | `5.1.0`  |
| `pinia`                       | `3.0.4`  |
| `pinia-plugin-persistedstate` | `4.7.1`  |
| `@vitejs/plugin-vue`          | `6.0.7`  |
| `vue-tsc`                     | `3.3.5`  |

## Notes

- **Vue Router 5.** Major bump from the widely-known v4. API used here
  (`createRouter`, `createWebHistory`, lazy `component: () => import(...)`,
  `RouterLink`/`RouterView`, `router-link-active` class) is unchanged from v4.
  Routes are typed with `RouteRecordRaw`. Per-route page titles live in
  `meta.title` and are announced on navigation in `App.vue`.
- **Pinia 3** with `pinia-plugin-persistedstate` 4 — registered in `main.ts`
  via `pinia.use(piniaPluginPersistedstate)`. Store-level persistence config
  arrives in M5.
- All components use `<script setup lang="ts">` (Composition API).
- Type-checking of `.vue` files is done by `vue-tsc` (not plain `tsc`).

## Conventions

- Small, single-responsibility components (~150 line soft cap).
- No business logic in components — it lives in `src/lib/` as pure, unit-tested
  functions. Components orchestrate and present.
- Path alias `@/` → `src/` (configured in both `vite.config.ts` and
  `tsconfig.app.json`).
