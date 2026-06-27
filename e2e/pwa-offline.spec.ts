import { test, expect } from '@playwright/test'

/**
 * PWA offline tests — run against the production build via `npm run preview`.
 * Usage: npm run build && npm run test:e2e:pwa
 *
 * Each new BrowserContext has isolated storage, so online and offline phases
 * must run in the SAME context. We prime the SW cache online, then toggle
 * context.setOffline(true) — Workbox intercepts fetch events before they reach
 * the network layer, so cached responses still work when network is emulated off.
 */

test('app loads from the production build', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/groups$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Gruppen' })).toBeVisible()
})

test('app works fully offline after first visit', async ({ context, page }) => {
  // --- Phase 1: prime the SW cache (online) ---
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Gruppen' })).toBeVisible()

  // Wait for networkidle so Workbox precaching has time to complete.
  await page.waitForLoadState('networkidle')

  // Ensure the SW is actually controlling this page (Workbox uses skipWaiting +
  // clientsClaim by default, so a single load + networkidle is normally enough).
  await page.evaluate(() => navigator.serviceWorker.ready)

  const hasController = await page.evaluate(() => !!navigator.serviceWorker.controller)
  if (!hasController) {
    // On rare first-install timing, reload once so clientsClaim takes effect.
    await page.reload()
    await page.waitForLoadState('networkidle')
  }

  // --- Phase 2: go offline and verify the app still works ---
  await context.setOffline(true)

  // In-page (Vue Router) navigation never hits the network — always works offline.
  await page.getByRole('link', { name: 'K.-o.-Runde' }).click()
  await expect(page).toHaveURL(/\/knockout$/)
  await expect(page.getByRole('heading', { level: 1, name: 'K.-o.-Runde' })).toBeVisible()

  await page.getByRole('link', { name: 'Einstellungen' }).click()
  await expect(page).toHaveURL(/\/settings$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeVisible()

  // Full navigation while offline — SW serves index.html from cache via navigateFallback.
  await page.goto('/')
  await expect(page).toHaveURL(/\/groups$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Gruppen' })).toBeVisible()
})
