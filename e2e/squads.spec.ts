import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.beforeEach(async ({ page }) => {
  await page.goto('/groups')
  await expect(page.getByRole('heading', { level: 1, name: 'Gruppen' })).toBeVisible()
})

test('clicking a team name in the standings opens the squad dialog', async ({ page }) => {
  const groupA = page.getByRole('article', { name: 'Gruppe A' })
  const standingsRegion = groupA.getByRole('region', { name: 'Tabelle' })
  const firstTeamBtn = standingsRegion.getByRole('button').first()
  await firstTeamBtn.click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  // Dialog contains a table with player rows
  await expect(dialog.locator('table')).toBeVisible()
})

test('squad dialog shows 26 player rows', async ({ page }) => {
  const groupA = page.getByRole('article', { name: 'Gruppe A' })
  const standingsRegion = groupA.getByRole('region', { name: 'Tabelle' })
  await standingsRegion.getByRole('button').first().click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const rows = dialog.locator('tbody tr')
  await expect(rows).toHaveCount(26)
})

test('pressing Escape closes the squad dialog', async ({ page }) => {
  const groupA = page.getByRole('article', { name: 'Gruppe A' })
  const standingsRegion = groupA.getByRole('region', { name: 'Tabelle' })
  await standingsRegion.getByRole('button').first().click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
})

test('squad dialog close button works', async ({ page }) => {
  const groupA = page.getByRole('article', { name: 'Gruppe A' })
  const standingsRegion = groupA.getByRole('region', { name: 'Tabelle' })
  await standingsRegion.getByRole('button').first().click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Schließen' }).click()
  await expect(dialog).not.toBeVisible()
})

test('squad dialog has no accessibility violations', async ({ page }) => {
  const groupA = page.getByRole('article', { name: 'Gruppe A' })
  const standingsRegion = groupA.getByRole('region', { name: 'Tabelle' })
  await standingsRegion.getByRole('button').first().click()

  await expect(page.getByRole('dialog')).toBeVisible()

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])
})
