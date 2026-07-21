import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// Minimal shapes for the service-worker globals referenced inside the
// runtimeCaching plugin callbacks below. Those callbacks run inside the
// generated service worker, not in this Node config file, so the real
// ServiceWorkerGlobalScope/CacheStorage DOM types aren't available here.
declare const self: { registration: { scope: string } }
declare const caches: {
  match: (request: string, options: { cacheName: string; ignoreSearch?: boolean }) => Promise<Response | undefined>
}

export default defineConfig(({ command }) => ({
  // GH Pages serves this app from a repo subpath (e.g. /wm2026-tracker/)
  // rather than from the domain root. Set DEPLOY_BASE_PATH to reproduce that
  // build locally, e.g. `DEPLOY_BASE_PATH=/wm2026-tracker/ npm run build`.
  base: process.env['DEPLOY_BASE_PATH'] ?? '/',
  build: {
    // Never inline assets as data URIs. The default (4 KB) would bake ~150 of
    // the flag SVGs referenced by styles/flags.scss into the flag CSS chunk as
    // base64, putting a huge blob on the critical path of every flag-rendering
    // view. As individual content-hashed files they are fetched on demand and
    // precached exactly once by the service worker.
    assetsInlineLimit: 0,
    target: 'es2025',
  },
  plugins: [
    vue(),
    {
      // The CSP meta tag in index.html (script-src/style-src 'self', no
      // 'unsafe-inline') is a production hardening measure that the dev
      // server can't satisfy: Vite's HMR client injects component styles as
      // inline <style> elements at runtime, which style-src 'self' blocks
      // outright, breaking every page's styling. Strip the whole
      // csp:start/csp:end block for `vite dev`; it stays intact for `vite
      // build`, which GH Pages actually serves.
      name: 'strip-csp-meta-in-dev',
      transformIndexHtml(html: string) {
        if (command !== 'serve') return html
        return html.replace(/<!-- csp:start[\s\S]*?<!-- csp:end -->\n?/, '')
      },
    },
    VitePWA({
      // Service worker disabled in dev to keep the dev server and e2e tests deterministic.
      devOptions: { enabled: false },
      // The manifest icons are already covered by globPatterns below (they live
      // in public/icons and match the png extension); without this they'd be
      // added to the precache manifest a second time.
      includeManifestIcons: false,
      // We register the SW ourselves via useRegisterSW() in UpdateDialog.vue so
      // it can observe needRefresh/updateServiceWorker; skip the auto-injected
      // registerSW.js script to avoid registering the SW twice.
      injectRegister: false,
      manifest: {
        background_color: '#0f172a',
        description: 'Offline-Tracker für die FIFA Weltmeisterschaft 2026',
        display: 'standalone',
        icons: [
          {
            sizes: '192x192',
            src: 'icons/icon-192.png',
            type: 'image/png',
          },
          {
            sizes: '512x512',
            src: 'icons/icon-512.png',
            type: 'image/png',
          },
          {
            purpose: 'maskable',
            sizes: '512x512',
            src: 'icons/icon-maskable-512.png',
            type: 'image/png',
          },
        ],
        // Relative to the manifest's own URL (per the Web App Manifest spec),
        // so app identity stays stable across deploy base paths (`/` locally,
        // `/<repo>/` on GH Pages) instead of implicitly deriving from start_url.
        id: '.',
        lang: 'de',
        name: 'WM 2026 Tracker',
        short_name: 'WM 2026',
        theme_color: '#0f172a',
      },
      // 'prompt' (rather than 'autoUpdate') so an updated SW installs and waits
      // instead of skip-waiting or reloading on its own.
      // UpdateDialog.vue surfaces the waiting update via useRegisterSW() and lets the user trigger the reload.
      registerType: 'prompt',
      workbox: {
        // Precaching's own route matches requests before runtimeCaching gets a
        // chance to: by default it maps any URL ending in "/" (i.e. the app's
        // start_url, both locally and under the GH Pages base path) to the
        // precached index.html and serves it cache-first, silently bypassing
        // the NetworkFirst navigate route below. Disabling it ensures every
        // navigation, including the root, goes through that route instead.
        directoryIndex: null,
        // Precache the built shell (hashed JS/CSS, fonts, icons, index.html).
        // index.html is precached only as a last-resort offline fallback, see handlerDidError below.
        // A brand-new page load is never controlled by its own not-yet-installed service worker.
        // So there is no other way to have an app shell ready before a second visit.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // vite-plugin-pwa defaults navigateFallback to 'index.html', which
        // registers a precache-only NavigationRoute ahead of the runtimeCaching
        // route below and would shadow it for every navigation. Disable it.
        navigateFallback: null,
        // Deliberately no route for third-party service requests (e.g. the
        // results-sync API): that data is live/time-sensitive, so serving a
        // stale cached response would be wrong, and a failed request already
        // surfaces a clear error to the user (see SyncDialog.vue / the
        // fetchError handling in use-match-result-form.ts) instead of silently
        // falling back to cache.
        runtimeCaching: [
          {
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              networkTimeoutSeconds: 3,
              plugins: [
                {
                  // GitHub Pages 404s deep-link paths it can't resolve server-side;
                  // treat that like a network failure so we fall back to the
                  // cached shell instead of caching/showing the 404 page.
                  // Not async (Workbox awaits the returned promise either way):
                  // rejecting instead of throwing keeps the failure inside the
                  // promise even if a caller chains .then() without awaiting.
                  fetchDidSucceed: ({ response }: { response: Response }) =>
                    response.ok
                      ? Promise.resolve(response)
                      : Promise.reject(new Error(`Bad navigation response: ${response.status}`)),
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
            urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
          },
        ],
      },
    }),
  ],
  test: {
    coverage: {
      exclude: [
        'src/**/*.spec.ts',
        'src/app/main.ts',
        'src/app/router.ts',
        'src/test-support/**',
        // Pure compile-time exhaustiveness guard: its only regression is caught
        // by tsc at every call site, so the runtime throw needs no test.
        'src/lib/assert-never.ts',
      ],
      include: ['src/**/*.ts', 'src/**/*.vue'],
      provider: 'v8',
      thresholds: {
        branches: 90,
        functions: 96,
        lines: 96,
        statements: 95,
      },
    },
    css: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['src/test-support/setup.ts'],
  },
}))
