# Vite + PWA

Pinned (exact) at scaffold time (2026-06-26):

| Package           | Version |
| ----------------- | ------- |
| `vite`            | `8.1.0` |
| `vite-plugin-pwa` | `1.3.0` |

## Notes

- **Vite 8** requires a modern Node (Node 24 in this environment). The dev
  server default port is 5173, which `playwright.config.ts` relies on.
- **Bundler is Rolldown, not esbuild.** Vite 8 ships with Rolldown (Rust-based,
  built on **Oxc**) as its bundler/transformer — there is no `esbuild` in
  `node_modules`; the deps are `rolldown` + `@rolldown/*`. This is the same Oxc
  toolchain family as our linter/formatter (`oxlint`/`oxfmt`).
- **`build.target: 'es2025'`** in `vite.config.ts` controls the JS _syntax_ level
  Rolldown emits. It is kept in sync with the `target`/`lib` pinning in
  `tsconfig.app.json` (see `docs/typescript-6.md`). Verified that Rolldown accepts
  `es2025` via an actual `npm run build`. Note Rolldown transpiles syntax but does
  **not** polyfill built-in _methods_, so the runtime baseline is browsers that
  natively ship ES2025 built-ins.
- Path alias `@` is configured via `resolve.alias` in `vite.config.ts` using
  `fileURLToPath(new URL('src', import.meta.url))` (no `./` prefix —
  `oxlint`'s `unicorn/relative-url-style`).
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
