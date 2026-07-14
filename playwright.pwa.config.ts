import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  fullyParallel: false,
  projects: [
    {
      name: 'chromium-pwa',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  reporter: 'list',
  testDir: './e2e',
  // Despite the "pwa" name, this config covers every test that needs the
  // production build rather than the dev server — csp.spec.ts rides along
  // because vite.config.ts strips the CSP meta tag in dev.
  testMatch: ['**/pwa-offline.spec.ts', '**/csp.spec.ts'],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  // The preview server must be started after a production build.
  // Run: npm run build && npm run test:e2e:pwa
  webServer: {
    command: 'npm run preview',
    reuseExistingServer: false,
    timeout: 60_000,
    url: BASE_URL,
  },
  // pwa-offline.spec.ts phase 2 rewrites dist/index.html on disk while `preview`
  // serves it — a second worker running concurrently would race that rewrite.
  // fullyParallel: false already prevents parallel tests within a single
  // worker; workers: 1 makes the single-worker guarantee explicit too.
  workers: 1,
})
