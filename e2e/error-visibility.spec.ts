import { test, expect } from '@playwright/test'
import { ERROR_LOG_KEY } from '../src/lib/error-log'
import { SettingsPage } from './support'

/**
 * The boot-error safety net (index.html) and the Settings → Diagnose error
 * log. The safety net exists for browsers that cannot parse the es2025
 * bundle, so the tests simulate that by intercepting the entry module — the
 * mock must answer with a JavaScript MIME type, otherwise Chromium blocks the
 * module on MIME checking and no `error` event ever fires (a mock artifact,
 * not the scenario under test).
 */

test('an unparseable bundle shows the fallback message instead of a white screen and logs the error', async ({
  page,
}) => {
  await page.route('**/src/main.ts*', (route) =>
    route.fulfill({ body: 'const kaputt = ??!;', contentType: 'text/javascript' }),
  )

  await page.goto('/')

  await expect(page.locator('#app .boot-fallback')).toContainText('Die App konnte nicht geladen werden')
  await expect
    .poll(() => page.evaluate((key) => window.localStorage.getItem(key), ERROR_LOG_KEY))
    .toContain('SyntaxError')
})

test('uncaught runtime errors do not clobber the app and surface in Settings → Diagnose', async ({ page }) => {
  const settings = new SettingsPage(page)
  await settings.goto()
  await settings.expectLoaded()
  await settings.errorLogEmptyState().waitFor()

  await page.evaluate(() => {
    window.setTimeout(() => {
      throw new Error('E2E-Testfehler')
    }, 0)
    void Promise.reject(new Error('E2E-Rejection'))
  })

  // Both handlers have written to localStorage once the entries exist.
  await page.waitForFunction((key) => (window.localStorage.getItem(key) ?? '').includes('E2E-Rejection'), ERROR_LOG_KEY)

  // The mounted app must survive: no fallback takeover, view still usable.
  await expect(page.locator('.boot-fallback')).toHaveCount(0)
  await settings.expectLoaded()

  // The view reads the log on mount, so entries appear after a reload.
  await page.reload()
  await expect(settings.errorLogEntries()).toHaveCount(2)
  await expect(settings.errorLogEntries().filter({ hasText: 'E2E-Testfehler' })).toBeVisible()
  await expect(settings.errorLogEntries().filter({ hasText: 'E2E-Rejection' })).toBeVisible()

  await settings.clearErrorLog()
  await expect(settings.errorLogEmptyState()).toBeVisible()
  expect(await page.evaluate((key) => window.localStorage.getItem(key), ERROR_LOG_KEY)).toBeNull()
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('the noscript message is shown', async ({ page }) => {
    await page.goto('/')

    const message = page.locator('noscript .boot-fallback')
    // Playwright's visibility check misreports noscript content as hidden
    // even when it paints, so assert on text plus a real layout box instead.
    await expect(message).toHaveText(/benötigt JavaScript/)
    expect(await message.boundingBox()).not.toBeNull()
  })
})
