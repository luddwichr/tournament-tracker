import { test, expect } from '@playwright/test'
import { AppNav, GroupsPage, KnockoutPage, SettingsPage, expectNoA11yViolations } from './support'

test('app shell loads and redirects to the groups view', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/groups$/)
  await new GroupsPage(page).expectLoaded()
})

test('main navigation reaches all routes', async ({ page }) => {
  await page.goto('/')
  const nav = new AppNav(page)

  await nav.goToKnockout()
  await expect(page).toHaveURL(/\/knockout$/)
  await new KnockoutPage(page).expectLoaded()

  await nav.goToRanking()
  await expect(page).toHaveURL(/\/ranking$/)
  await expect(page.getByRole('heading', { level: 1, name: 'FIFA-Weltrangliste' })).toBeVisible()

  await nav.goToSettings()
  await expect(page).toHaveURL(/\/settings$/)
  await new SettingsPage(page).expectLoaded()
})

test('home route has no detectable accessibility violations', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  await expectNoA11yViolations(page)
})
