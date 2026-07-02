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
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      // Service worker disabled in dev to keep the dev server and e2e tests deterministic.
      devOptions: { enabled: false },
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
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.spec.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.vue'],
      exclude: ['src/**/*.spec.ts', 'src/main.ts', 'src/router.ts', 'src/test-support/**'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
})
