import { AppNav, GroupsPage, KnockoutPage, SettingsPage } from './support'
import { expect, test } from '@playwright/test'

/**
 * CSP behaviour of the shipped bundle. These tests require the production
 * build (like the rest of the e2e suite, see playwright.config.ts):
 * vite.config.ts strips the CSP meta tag entirely for `vite dev`, since the
 * dev server's HMR client relies on inline <style> injection that the policy
 * would block. Usage: npm run build && npm run test:e2e
 */

test('the CSP meta tag declares the expected directives', async ({ page }) => {
  await page.goto('/')

  const meta = page.locator('meta[http-equiv="Content-Security-Policy"]')
  await expect(meta).toHaveCount(1)

  const content = await meta.getAttribute('content')
  const directives = Object.fromEntries(
    (content ?? '')
      .split(';')
      .map((directive) => directive.trim())
      .filter(Boolean)
      .map((directive): [string, string[]] => {
        const [name = '', ...values] = directive.split(/\s+/)
        return [name, values]
      }),
  )

  expect(directives['default-src']).toEqual(["'self'"])
  expect(directives['script-src']).toEqual(["'self'"])
  expect(directives['style-src']).toEqual(["'self'"])
  expect(directives['img-src']).toEqual(["'self'"])
  expect(directives['connect-src']).toEqual(["'self'", 'https://site.api.espn.com'])
  expect(directives['base-uri']).toEqual(["'self'"])
  expect(directives['form-action']).toEqual(["'none'"])
  expect(directives['object-src']).toEqual(["'none'"])
  // Header-only directive: a <meta> CSP can't enforce it, so it's deliberately absent.
  expect(directives['frame-ancestors']).toBeUndefined()
})

test('normal navigation triggers no CSP violations', async ({ page }) => {
  const cspErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text().includes('Content Security Policy')) {
      cspErrors.push(message.text())
    }
  })

  const nav = new AppNav(page)
  const groups = new GroupsPage(page)
  const settings = new SettingsPage(page)

  await page.goto('/')
  await groups.expectLoaded()

  await nav.goToKnockout()
  await new KnockoutPage(page).expectLoaded()

  await nav.goToRanking()
  await expect(page.getByRole('heading', { level: 1, name: 'FIFA-Weltrangliste' })).toBeVisible()

  await nav.goToSettings()
  await settings.expectLoaded()
  // Exercises a Vue-teleported dialog subtree too, without triggering a real network request.
  const dialog = await settings.openResetDialog()
  await dialog.click('Abbrechen')

  expect(cspErrors).toEqual([])
})
