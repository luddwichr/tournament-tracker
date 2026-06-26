# Vite + PWA

Pinned (exact) at scaffold time (2026-06-26):

| Package           | Version |
| ----------------- | ------- |
| `vite`            | `8.1.0` |
| `vite-plugin-pwa` | `1.3.0` |

## Notes

- **Vite 8** requires a modern Node (Node 24 in this environment). The dev
  server default port is 5173, which `playwright.config.ts` relies on.
- Path alias `@` is configured via `resolve.alias` in `vite.config.ts` using
  `fileURLToPath(new URL('./src', import.meta.url))`.
- **Vitest config is co-located** in `vite.config.ts` via the `test` key, so the
  config is imported from `vitest/config` (not `vite`) to get the typed `test`
  field. See `docs/testing.md`.

## PWA status (full work is milestone M8)

The plugin is registered now with a minimal, valid German manifest
(`name: 'WM 2026 Tracker'`, `lang: 'de'`) so the scaffold builds and types
resolve (`vite-plugin-pwa/client` is referenced in `env.d.ts`).

- `registerType: 'autoUpdate'`.
- `devOptions.enabled: false` — **deliberate**: keeps the dev server and
  Playwright e2e runs deterministic by not registering a service worker in dev.
  M8 will flesh out Workbox precaching, icons under `public/icons/`, theme
  color and the offline e2e test, and will enable/verify SW behavior.
