import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// Minimal shapes for the service-worker globals referenced inside the
// runtimeCaching plugin callbacks below. Those callbacks run inside the
// generated service worker, not in this Node config file, so the real
// ServiceWorkerGlobalScope/CacheStorage DOM types aren't available here.
declare const self: { registration: { scope: string } }
declare const caches: {
  match: (request: string, options: { cacheName: string; ignoreSearch?: boolean }) => Promise<Response | undefined>
}

export default defineConfig({
  // GH Pages serves this app from a repo subpath (e.g. /wm2026-tracker/)
  // rather than from the domain root. Set DEPLOY_BASE_PATH to reproduce that
  // build locally, e.g. `DEPLOY_BASE_PATH=/wm2026-tracker/ npm run build`.
  base: process.env['DEPLOY_BASE_PATH'] ?? '/',
  plugins: [
    vue(),
    VitePWA({
      // 'prompt' (rather than 'autoUpdate') so an updated SW installs and waits
      // instead of skip-waiting/reloading on its own — UpdateDialog.vue surfaces
      // the waiting update via useRegisterSW() and lets the user trigger the reload.
      registerType: 'prompt',
      // We register the SW ourselves via useRegisterSW() in UpdateDialog.vue so
      // it can observe needRefresh/updateServiceWorker; skip the auto-injected
      // registerSW.js script to avoid registering the SW twice.
      injectRegister: false,
      // Service worker disabled in dev to keep the dev server and e2e tests deterministic.
      devOptions: { enabled: false },
      // The manifest icons are already covered by globPatterns below (they live
      // in public/icons and match the png extension); without this they'd be
      // added to the precache manifest a second time.
      includeManifestIcons: false,
      workbox: {
        // Precache the built shell (hashed JS/CSS, fonts, icons, index.html).
        // index.html is precached only as a last-resort offline fallback — see
        // handlerDidError below — since a brand-new page load is never
        // controlled by its own not-yet-installed service worker, so there's
        // no other way to have an app shell ready before a second visit.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // vite-plugin-pwa defaults navigateFallback to 'index.html', which
        // registers a precache-only NavigationRoute ahead of the runtimeCaching
        // route below and would shadow it for every navigation. Disable it.
        navigateFallback: null,
        // Precaching's own route matches requests before runtimeCaching gets a
        // chance to: by default it maps any URL ending in "/" (i.e. the app's
        // start_url, both locally and under the GH Pages base path) to the
        // precached index.html and serves it cache-first, silently bypassing
        // the NetworkFirst navigate route below. Disabling it ensures every
        // navigation — including the root — goes through that route instead.
        directoryIndex: null,
        // Deliberately no route for third-party service requests (e.g. the
        // results-sync API): that data is live/time-sensitive, so serving a
        // stale cached response would be wrong, and a failed request already
        // surfaces a clear error to the user (see SyncDialog.vue / the
        // fetchError handling in use-match-result-form.ts) instead of silently
        // falling back to cache.
        runtimeCaching: [
          {
            urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              networkTimeoutSeconds: 3,
              plugins: [
                {
                  // GitHub Pages 404s deep-link paths it can't resolve server-side;
                  // treat that like a network failure so we fall back to the
                  // cached shell instead of caching/showing the 404 page.
                  fetchDidSucceed: async ({ response }: { response: Response }) => {
                    if (!response.ok) {
                      throw new Error(`Bad navigation response: ${response.status}`)
                    }
                    return response
                  },
                  // Last resort when offline and this exact path was never
                  // cached at runtime: fall back to the precached shell.
                  // `ignoreSearch` skips over Workbox's `__WB_REVISION__`
                  // cache-busting query param on the precached entry.
                  handlerDidError: async () =>
                    caches.match(`${self.registration.scope}index.html`, {
                      cacheName: `workbox-precache-v2-${self.registration.scope}`,
                      ignoreSearch: true,
                    }),
                },
              ],
            },
          },
        ],
      },
      manifest: {
        // Relative to the manifest's own URL (per the Web App Manifest spec),
        // so app identity stays stable across deploy base paths (`/` locally,
        // `/<repo>/` on GH Pages) instead of implicitly deriving from start_url.
        id: '.',
        name: 'WM 2026 Tracker',
        short_name: 'WM 2026',
        description: 'Offline-Tracker für die FIFA Weltmeisterschaft 2026',
        lang: 'de',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  build: {
    // keep tsconfig.base.json target in sync with libs in tsconfig.*.json files and vite.config.ts `build.target`
    target: 'es2025',
    // Never inline assets as data URIs. The default (4 KB) would bake ~150 of
    // the flag SVGs referenced by styles/flags.scss into the flag CSS chunk as
    // base64, putting a huge blob on the critical path of every flag-rendering
    // view. As individual content-hashed files they are fetched on demand and
    // precached exactly once by the service worker.
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['src/test-support/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.vue'],
      exclude: ['src/**/*.spec.ts', 'src/main.ts', 'src/router.ts', 'src/test-support/**'],
      thresholds: {
        lines: 96,
        functions: 96,
        branches: 90,
        statements: 95,
      },
    },
  },
})
