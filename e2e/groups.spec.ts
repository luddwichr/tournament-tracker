import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { teams } from '../src/data/teams'
import { GROUP_IDS } from '../src/types/tournament'
import { groupMatches } from '../src/data/fixtures-2026'
import type { Result } from '../src/types/tournament'

const STORAGE_KEY = 'wc2026:results:v1'

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

test('each group has exactly 4 team rows and 6 match buttons', async ({ page }) => {
  for (const groupId of GROUP_IDS) {
    const card = page.getByRole('article', { name: `Gruppe ${groupId}` })
    // Teams rendered as <tbody tr> rows in the standings table
    const standingsRegion = card.getByRole('region', { name: 'Tabelle' })
    const teamRows = standingsRegion.locator('tbody tr')
    await expect(teamRows).toHaveCount(4)
    // Matches rendered as <button> elements in the Spiele section
    const matchesRegion = card.getByRole('region', { name: 'Spiele' })
    const matchButtons = matchesRegion.getByRole('button')
    await expect(matchButtons).toHaveCount(6)
  }
})

test('groups view has no detectable accessibility violations', async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()

  expect(results.violations).toEqual([])
})

// ---------------------------------------------------------------------------
// Match status badges
// ---------------------------------------------------------------------------

test('unresolved group matches show the "läuft" status badge (tournament is underway)', async ({
  page,
}) => {
  // Freeze Date.now() to mid-tournament so all group kickoffs are in the past.
  // addInitScript runs before page scripts on each navigation.
  await page.addInitScript(() => {
    const FIXED = new Date('2026-06-27T12:00:00Z').getTime()
    Date.now = () => FIXED
  })
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY)
  await page.goto('/groups')
  // Wait for Vue to finish rendering the group tables before querying status badges.
  await expect(page.getByRole('heading', { level: 1, name: 'Gruppen' })).toBeVisible()
  await expect(page.locator('.match-card').first()).toBeVisible()
  await expect(page.locator('.match-card__status--live').first()).toBeVisible()
  await expect(page.locator('.match-card__status--live').first()).toHaveText('läuft')
})

test('a group match with an entered result shows the "beendet" status badge', async ({ page }) => {
  // Seed one result for Group A's first match.
  const firstGroupMatch = groupMatches.filter((m) => m.group === 'A')[0]!
  const result: Result = {
    matchId: firstGroupMatch.id,
    homeGoals: 2,
    awayGoals: 1,
    homeYellow: 0,
    homeRed: 0,
    awayYellow: 0,
    awayRed: 0,
  }
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value as string),
    [STORAGE_KEY, JSON.stringify({ version: 1, results: { [firstGroupMatch.id]: result } })],
  )
  await page.goto('/groups')

  const groupACard = page.getByRole('article', { name: 'Gruppe A' })
  const finishedBadge = groupACard.locator('.match-card__status--finished').first()
  await expect(finishedBadge).toBeVisible()
  await expect(finishedBadge).toHaveText('beendet')
})
