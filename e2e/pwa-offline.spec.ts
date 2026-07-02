import { promises as fs } from 'node:fs'
import path from 'node:path'
import { test, expect } from '@playwright/test'
import { AppNav, GroupsPage, KnockoutPage, SettingsPage } from './support'

const indexHtmlPath = path.resolve(import.meta.dirname, '..', 'dist', 'index.html')

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

  // Full navigation while offline — SW serves the cached shell (NetworkFirst
  // falls back to the 'pages' cache when the network is unreachable).
  await page.goto('/')
  await expect(page).toHaveURL(/\/groups$/)
  await groups.expectLoaded()
})

test('reload fetches a new deploy over the network instead of a stale cache', async ({ context, page }) => {
  const originalHtml = await fs.readFile(indexHtmlPath, 'utf-8')
  const marker = 'e2e-deploy-marker'

  try {
    // --- Phase 1: prime the SW cache with the current build (online) ---
    await page.goto('/')
    await new GroupsPage(page).expectLoaded()
    await page.waitForLoadState('networkidle')
    await page.evaluate(() => navigator.serviceWorker.ready)

    // --- Phase 2: simulate a new deploy by rewriting the served index.html,
    // then reload while still online. NetworkFirst must hit the network and
    // pick up the new file rather than reusing the shell cached in phase 1.
    await fs.writeFile(
      indexHtmlPath,
      originalHtml.replace('<head>', `<head>\n    <meta name="${marker}" content="v2">`),
    )
    await page.reload()
    await page.waitForLoadState('networkidle')

    await expect(page.locator(`meta[name="${marker}"]`)).toHaveCount(1)
    await new GroupsPage(page).expectLoaded()

    // --- Phase 3: the freshly-fetched shell is now cached — verify it (not
    // the phase-1 shell) is what NetworkFirst falls back to when offline.
    await context.setOffline(true)
    await page.reload()

    await expect(page.locator(`meta[name="${marker}"]`)).toHaveCount(1)
    await new GroupsPage(page).expectLoaded()
  } finally {
    await fs.writeFile(indexHtmlPath, originalHtml)
  }
})
