import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
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
  // pwa-offline.spec.ts rewrites dist/index.html on disk mid-test, which would
  // race this parallel suite on the same preview server — it runs in its own
  // serial config via test:e2e:pwa.
  testIgnore: ['**/pwa-offline.spec.ts'],
  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    // This suite tests the app, not the service worker (pwa-offline.spec.ts
    // covers that). Left registered, the SW takes over fetches mid-test, which
    // bypasses page.route() interception and adds cache state between reloads.
    serviceWorkers: 'block',
    trace: 'on-first-retry',
  },
  // Serves the production bundle from dist/ so tests exercise the app exactly
  // as shipped (CSP meta tag intact, hashed es2025 chunks, minified).
  // Run: npm run build && npm run test:e2e
  // reuseExistingServer stays false so tests never silently run against a
  // stale preview of an older build.
  webServer: {
    command: 'npm run preview',
    reuseExistingServer: false,
    timeout: 60_000,
    url: BASE_URL,
  },
})
