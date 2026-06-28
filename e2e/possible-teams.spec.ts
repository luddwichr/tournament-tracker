import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { groupMatches } from '../src/data/fixtures-2026'
import type { Result } from '../src/types/tournament'

const STORAGE_KEY = 'wc2026:results:v1'

function makeResult(matchId: string, homeGoals = 1, awayGoals = 0): Result {
  return { matchId, homeGoals, awayGoals, homeYellow: 0, homeRed: 0, awayYellow: 0, awayRed: 0 }
}

function storedState(results: Record<string, Result>): string {
  return JSON.stringify({ results })
}

function allGroupResults(): Record<string, Result> {
  const results: Record<string, Result> = {}
  for (const m of groupMatches) results[m.id] = makeResult(m.id)
  return results
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY)
})

// ---------------------------------------------------------------------------
// Button visibility
// ---------------------------------------------------------------------------

test('each R32 card has a "Mögliche Teams" button when no results entered', async ({ page }) => {
  await page.goto('/knockout')
  const r32Round = page.locator('.bracket-round').first()
  // Wait for the round to render
  await r32Round.waitFor()
  const buttons = r32Round.getByRole('button', { name: /Mögliche Teams/ })
  // 16 R32 matches × 2 unresolved team slots each = 32 buttons
  await expect(buttons).toHaveCount(32)
})

test('"Mögliche Teams" buttons disappear from R32 once all group results are entered', async ({ page }) => {
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value as string),
    [STORAGE_KEY, storedState(allGroupResults())],
  )
  await page.goto('/knockout')
  const r32Round = page.locator('.bracket-round').first()
  // All R32 participants now known — buttons should be gone
  await expect(r32Round.getByRole('button', { name: /Mögliche Teams/ })).toHaveCount(0)
})

// ---------------------------------------------------------------------------
// Dialog opens and shows teams
// ---------------------------------------------------------------------------

test('clicking "Mögliche Teams" opens a dialog listing possible teams', async ({ page }) => {
  await page.goto('/knockout')
  // Click the first "Mögliche Teams" button in the R32 round
  const r32Round = page.locator('.bracket-round').first()
  await r32Round
    .getByRole('button', { name: /Mögliche Teams/ })
    .first()
    .click()

  const dialog = page.getByRole('dialog', { name: /Mögliche Teams/ })
  await expect(dialog).toBeVisible()
})

test('the possible-teams dialog lists team names with flags', async ({ page }) => {
  await page.goto('/knockout')
  const r32Round = page.locator('.bracket-round').first()
  await r32Round
    .getByRole('button', { name: /Mögliche Teams/ })
    .first()
    .click()

  const dialog = page.getByRole('dialog', { name: /Mögliche Teams/ })
  await expect(dialog).toBeVisible()

  // The dialog must contain at least one team name (non-empty list)
  const items = dialog.locator('.possible-teams-dialog__item')
  await expect(items.first()).toBeVisible()

  // Each item has a flag (role="img") and a team name
  const firstItem = items.first()
  await expect(firstItem.getByRole('img')).toBeVisible()
  await expect(firstItem.locator('.possible-teams-dialog__team-name')).not.toBeEmpty()
})

test('dialog shows only the possible teams for the clicked slot (home side of M73)', async ({ page }) => {
  // M73 is A2 vs B2. Clicking the home-slot button shows only the 4 possible home teams (group A).
  await page.goto('/knockout')
  const r32Round = page.locator('.bracket-round').first()
  await r32Round
    .getByRole('button', { name: /Mögliche Teams/ })
    .first()
    .click()

  const dialog = page.getByRole('dialog', { name: /Mögliche Teams/ })
  await expect(dialog).toBeVisible()
  // First button = home placeholder → 4 possible teams from group A only
  const items = dialog.locator('.possible-teams-dialog__item')
  await expect(items).toHaveCount(4)
})

// ---------------------------------------------------------------------------
// Dialog close
// ---------------------------------------------------------------------------

test('Escape closes the possible-teams dialog', async ({ page }) => {
  await page.goto('/knockout')
  const r32Round = page.locator('.bracket-round').first()
  await r32Round
    .getByRole('button', { name: /Mögliche Teams/ })
    .first()
    .click()

  const dialog = page.getByRole('dialog', { name: /Mögliche Teams/ })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
})

test('close button (✕) closes the possible-teams dialog', async ({ page }) => {
  await page.goto('/knockout')
  const r32Round = page.locator('.bracket-round').first()
  await r32Round
    .getByRole('button', { name: /Mögliche Teams/ })
    .first()
    .click()

  const dialog = page.getByRole('dialog', { name: /Mögliche Teams/ })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Schließen' }).click()
  await expect(dialog).not.toBeVisible()
})

// ---------------------------------------------------------------------------
// Partial results: partially-played bracket shows narrowed-down possible teams
// ---------------------------------------------------------------------------

test('R16 "Mögliche Teams" dialog lists teams from correct upstream R32 matches', async ({ page }) => {
  // Seed all group results so R32 is populated. Leave R32 unplayed so R16 slots
  // are still unresolved.
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value as string),
    [STORAGE_KEY, storedState(allGroupResults())],
  )
  await page.goto('/knockout')

  // R16 round is the second .bracket-round column
  const r16Round = page.locator('.bracket-round').nth(1)
  const firstBtn = r16Round.getByRole('button', { name: /Mögliche Teams/ }).first()
  await expect(firstBtn).toBeVisible()
  await firstBtn.click()

  const dialog = page.getByRole('dialog', { name: /Mögliche Teams/ })
  await expect(dialog).toBeVisible()

  // Clicking the home-slot button of M90 shows only 2 possible teams:
  // the winner of M73 (A2 or B2) — both R32 participants are known but M73 is unplayed.
  const items = dialog.locator('.possible-teams-dialog__item')
  await expect(items).toHaveCount(2)
})

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

test('possible-teams dialog has no accessibility violations', async ({ page }) => {
  await page.goto('/knockout')
  const r32Round = page.locator('.bracket-round').first()
  await r32Round
    .getByRole('button', { name: /Mögliche Teams/ })
    .first()
    .click()

  await expect(page.getByRole('dialog', { name: /Mögliche Teams/ })).toBeVisible()

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])
})

test('knockout view with possible-teams buttons has no accessibility violations', async ({ page }) => {
  await page.goto('/knockout')
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])
})
