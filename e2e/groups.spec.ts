import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { teams } from '../src/data/teams'
import { GROUP_IDS } from '../src/types/tournament'

test.beforeEach(async ({ page }) => {
  await page.goto('/groups')
  await expect(page.getByRole('heading', { level: 1, name: 'Gruppen' })).toBeVisible()
})

test('shows all 12 group headings', async ({ page }) => {
  for (const groupId of GROUP_IDS) {
    await expect(page.getByRole('heading', { level: 2, name: `Gruppe ${groupId}` })).toBeVisible()
  }
})

test('shows all 48 team names', async ({ page }) => {
  for (const team of teams) {
    await expect(page.getByText(team.name, { exact: true }).first()).toBeVisible()
  }
})

test('each group has exactly 4 teams and 6 matches', async ({ page }) => {
  for (const groupId of GROUP_IDS) {
    const card = page.getByRole('article', { name: `Gruppe ${groupId}` })
    const teamItems = card.getByRole('listitem')
    await expect(teamItems).toHaveCount(4)
    const matchCards = card.getByRole('article')
    await expect(matchCards).toHaveCount(6)
  }
})

test('groups view has no detectable accessibility violations', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  expect(results.violations).toEqual([])
})
