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
      // The service worker and its caching do not depend on the viewport, so the PWA suite runs on desktop only.
      testIgnore: ['**/pwa-offline.spec.ts'],
      use: { ...devices['Pixel 7'] },
    },
  ],
  // Locally, 'failures' prints only failures and flaky retries plus a summary, which keeps agent and hook runs short.
  // CI keeps 'github', which turns failures into annotations on the PR.
  reporter: isCI ? 'github' : 'failures',
  retries: isCI ? 2 : 0,
  testDir: './e2e',
  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    // Left registered, the service worker takes over fetches mid-test, which bypasses page.route() interception and
    // adds cache state between reloads.
    // pwa-offline.spec.ts is the one spec that allows it, because the service worker is what it tests.
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
  // Playwright's default is '50%' of the available cores.
  // The GitHub runner has four and this suite is IO-bound against a local preview server, so half of them left the
  // longest step in CI running at half speed.
  // Locally the default stays, to leave headroom for whatever else the machine is doing.
  workers: isCI ? '100%' : '50%',
})
