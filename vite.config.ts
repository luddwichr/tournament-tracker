import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      // Service worker disabled in dev to keep the dev server and e2e tests deterministic.
      devOptions: { enabled: false },
      workbox: {
        // Precache the built shell + all static assets (JS, CSS, fonts, images).
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // SPA fallback so every deep-link works offline.
        navigateFallback: 'index.html',
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
