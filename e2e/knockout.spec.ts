import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { groupMatches } from '../src/data/fixtures-2026'
import type { Result } from '../src/types/tournament'

const STORAGE_KEY = 'wc2026:results:v1'

function makeResult(matchId: string): Result {
  return { matchId, homeGoals: 1, awayGoals: 0, homeYellow: 0, homeRed: 0, awayYellow: 0, awayRed: 0 }
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
// Structure
// ---------------------------------------------------------------------------

test('shows all 5 round headings', async ({ page }) => {
  await page.goto('/knockout')
  for (const title of ['Runde der 32', 'Achtelfinale', 'Viertelfinale', 'Halbfinale', 'Finale']) {
    await expect(page.getByRole('heading', { level: 2, name: title, exact: true })).toBeVisible()
  }
})

test('renders 32 match cards in total', async ({ page }) => {
  await page.goto('/knockout')
  await expect(page.locator('button.match-card')).toHaveCount(32)
})

test('final column shows section labels for both end-stage matches', async ({ page }) => {
  await page.goto('/knockout')
  const labels = page.locator('.bracket-round__section-label')
  await expect(labels).toHaveCount(2)
  await expect(labels.nth(0)).toContainText('Spiel um Platz 3')
  await expect(labels.nth(1)).toContainText('Finale')
})

// ---------------------------------------------------------------------------
// Placeholder labels
// ---------------------------------------------------------------------------

test('placeholder labels are meaningful — no bare "?" shown', async ({ page }) => {
  await page.goto('/knockout')
  // Wait for the bracket to be rendered
  await page.locator('.bracket-round').first().waitFor()
  const placeholders = page.locator('.match-card__placeholder')
  const count = await placeholders.count()
  expect(count).toBeGreaterThan(0)
  for (const text of await placeholders.allTextContents()) {
    expect(text.trim()).not.toBe('?')
  }
})

test('R32 group-rank placeholders include "Gruppe" and the group letter', async ({ page }) => {
  await page.goto('/knockout')
  // M73 is A2 vs B2 — first card in R32 column
  const r32Round = page.locator('.bracket-round').first()
  const firstCard = r32Round.locator('.match-card__placeholder')
  const texts = await firstCard.allTextContents()
  // Both placeholders should mention a group letter
  for (const t of texts) {
    expect(t).toMatch(/Gruppe [A-L]/)
  }
})

// ---------------------------------------------------------------------------
// Disabled / enabled state
// ---------------------------------------------------------------------------

test('all 16 R32 cards are disabled without group results', async ({ page }) => {
  await page.goto('/knockout')
  const r32Round = page.locator('.bracket-round').first()
  await expect(r32Round.locator('button.match-card[disabled]')).toHaveCount(16)
})

test('all 16 R32 cards become enabled after all group results are entered', async ({ page }) => {
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value as string),
    [STORAGE_KEY, storedState(allGroupResults())],
  )
  await page.goto('/knockout')
  const r32Round = page.locator('.bracket-round').first()
  // No disabled R32 cards
  await expect(r32Round.locator('button.match-card[disabled]')).toHaveCount(0)
  await expect(r32Round.locator('button.match-card')).toHaveCount(16)
})

// ---------------------------------------------------------------------------
// ScoreDialog interaction
// ---------------------------------------------------------------------------

test('clicking an enabled R32 card opens ScoreDialog with resolved team names', async ({
  page,
}) => {
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value as string),
    [STORAGE_KEY, storedState(allGroupResults())],
  )
  await page.goto('/knockout')

  await page.locator('.bracket-round').first().locator('button.match-card').first().click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const title = dialog.locator('.score-dialog__title')
  const text = await title.textContent()
  // Title must name two real teams, not generic fallback strings
  expect(text).toMatch(/Ergebnis: .+ – .+/)
  expect(text).not.toContain('Heim')
  expect(text).not.toContain('Gast')
})

test('Escape closes the ScoreDialog', async ({ page }) => {
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value as string),
    [STORAGE_KEY, storedState(allGroupResults())],
  )
  await page.goto('/knockout')

  await page.locator('.bracket-round').first().locator('button.match-card').first().click()
  await expect(page.getByRole('dialog')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
})

test('entering a knockout result propagates to the next round', async ({ page }) => {
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value as string),
    [STORAGE_KEY, storedState(allGroupResults())],
  )
  await page.goto('/knockout')

  // Enter a result for the first R32 match (M73: A2 vs B2)
  await page.locator('.bracket-round').first().locator('button.match-card').first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  // Increment home goals once via the "+" step button (first .score-input__step that shows "+")
  await dialog.locator('.score-input__step').filter({ hasText: '+' }).first().click()
  await dialog.getByRole('button', { name: 'Speichern' }).click()
  await expect(dialog).not.toBeVisible()

  // M73 winner (A2, home win) should now appear as the resolved home team in M90 (R16 index 1)
  // M90 homeRef = winner(M73), awayRef = winner(M75) — M75 still unresolved
  const m90card = page.locator('.bracket-round').nth(1).locator('button.match-card').nth(1)
  await expect(m90card.locator('.team-label')).toHaveCount(1)
  await expect(m90card.locator('.match-card__placeholder')).toHaveCount(1)
})

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

test('knockout view has no detectable accessibility violations', async ({ page }) => {
  await page.goto('/knockout')
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])
})

test('knockout view with group results has no detectable accessibility violations', async ({
  page,
}) => {
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value as string),
    [STORAGE_KEY, storedState(allGroupResults())],
  )
  await page.goto('/knockout')
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(results.violations).toEqual([])
})
