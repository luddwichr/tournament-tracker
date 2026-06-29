import { test, expect } from '@playwright/test'
import { AppNav, GroupsPage, KnockoutPage, SettingsPage } from './support'

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
  await new GroupsPage(page).expectLoaded()
})

test('app works fully offline after first visit', async ({ context, page }) => {
  const nav = new AppNav(page)
  const groups = new GroupsPage(page)
  const knockout = new KnockoutPage(page)
  const settings = new SettingsPage(page)

  // --- Phase 1: prime the SW cache (online) ---
  await page.goto('/')
  await groups.expectLoaded()

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
  await nav.goToKnockout()
  await expect(page).toHaveURL(/\/knockout$/)
  await knockout.expectLoaded()

  await nav.goToSettings()
  await expect(page).toHaveURL(/\/settings$/)
  await settings.expectLoaded()

  // Full navigation while offline — SW serves index.html from cache via navigateFallback.
  await page.goto('/')
  await expect(page).toHaveURL(/\/groups$/)
  await groups.expectLoaded()
})
