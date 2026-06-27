import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// PWA is fleshed out in milestone M8; here we register the plugin with a
// minimal, valid manifest so the scaffold builds. Service worker generation in
// dev is disabled to keep the dev server and e2e tests deterministic.
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
      manifest: {
        name: 'WM 2026 Tracker',
        short_name: 'WM 2026',
        lang: 'de',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#0f172a',
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
  },
})
