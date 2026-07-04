import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/pwa-offline.spec.ts',
  fullyParallel: false,
  // pwa-offline.spec.ts phase 2 rewrites dist/index.html on disk while `preview`
  // serves it — a second worker running concurrently would race that rewrite.
  // fullyParallel: false already prevents parallel tests within a single
  // worker; workers: 1 makes the single-worker guarantee explicit too.
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium-pwa',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // The preview server must be started after a production build.
  // Run: npm run build && npm run test:e2e:pwa
  webServer: {
    command: 'npm run preview',
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
