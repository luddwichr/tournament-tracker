import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('app shell loads and redirects to the groups view', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/groups$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Gruppen' })).toBeVisible()
})

test('main navigation reaches all three routes', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('link', { name: 'K.-o.-Runde' }).click()
  await expect(page).toHaveURL(/\/knockout$/)
  await expect(page.getByRole('heading', { level: 1, name: 'K.-o.-Runde' })).toBeVisible()

  await page.getByRole('link', { name: 'Einstellungen' }).click()
  await expect(page).toHaveURL(/\/settings$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeVisible()
})

test('home route has no detectable accessibility violations', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  expect(results.violations).toEqual([])
})
