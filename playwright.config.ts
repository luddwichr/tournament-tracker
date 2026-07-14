import { defineConfig, devices } from '@playwright/test'

const PORT = 5173
const BASE_URL = `http://localhost:${PORT}`
const isCI = !!process.env['CI']

export default defineConfig({
  forbidOnly: isCI,
  fullyParallel: true,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
  reporter: isCI ? 'github' : 'list',
  retries: isCI ? 2 : 0,
  testDir: './e2e',
  // pwa-offline.spec.ts and csp.spec.ts need the production preview server —
  // run via test:e2e:pwa. (The dev server strips the CSP meta tag entirely,
  // see vite.config.ts, so csp.spec.ts would fail here regardless.)
  testIgnore: ['**/pwa-offline.spec.ts', '**/csp.spec.ts'],
  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    reuseExistingServer: !isCI,
    timeout: 120_000,
    url: BASE_URL,
  },
})
