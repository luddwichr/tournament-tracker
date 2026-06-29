import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { STORAGE_KEY, storedState, allGroupResults } from './support/results'

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
  await expect(page.locator('.match-card')).toHaveCount(32)
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
  await expect(r32Round.locator('.match-card__score-btn[disabled]')).toHaveCount(16)
})

test('all 16 R32 cards become enabled after all group results are entered', async ({ page }) => {
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value as string),
    [STORAGE_KEY, storedState(allGroupResults())],
  )
  await page.goto('/knockout')
  const r32Round = page.locator('.bracket-round').first()
  // No disabled R32 cards
  await expect(r32Round.locator('.match-card__score-btn[disabled]')).toHaveCount(0)
  await expect(r32Round.locator('.match-card')).toHaveCount(16)
})

// ---------------------------------------------------------------------------
// ScoreDialog interaction
// ---------------------------------------------------------------------------

test('clicking an enabled R32 card opens ScoreDialog with resolved team names', async ({ page }) => {
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value as string),
    [STORAGE_KEY, storedState(allGroupResults())],
  )
  await page.goto('/knockout')

  await page.locator('.bracket-round').first().locator('.match-card').first().locator('.match-card__score-btn').click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const title = dialog.locator('.base-dialog__title')
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

  await page.locator('.bracket-round').first().locator('.match-card').first().locator('.match-card__score-btn').click()
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
  await page.locator('.bracket-round').first().locator('.match-card').first().locator('.match-card__score-btn').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  // Increment home goals once via the "+" step button (first .stepper__step that shows "+")
  await dialog.locator('.stepper__step').filter({ hasText: '+' }).first().click()
  await dialog.getByRole('button', { name: 'Speichern' }).click()
  await expect(dialog).not.toBeVisible()

  // M73 winner (A2, home win) should now appear as the resolved home team in M90 (R16 index 0)
  // M90 homeRef = winner(M73), awayRef = winner(M75) — M75 still unresolved
  // M90 kicks off earlier than M89 (UTC), so it sorts to position 0 in the R16 column.
  const m90card = page.locator('.bracket-round').nth(1).locator('.match-card').nth(0)
  await expect(m90card.locator('.team-label')).toHaveCount(1)
  await expect(m90card.locator('.match-card__placeholder')).toHaveCount(1)
})

// ---------------------------------------------------------------------------
// Penalty winner picker
// ---------------------------------------------------------------------------

test('penalty winner section is hidden for a non-tied knockout score', async ({ page }) => {
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value as string),
    [STORAGE_KEY, storedState(allGroupResults())],
  )
  await page.goto('/knockout')
  await page.locator('.bracket-round').first().locator('.match-card').first().locator('.match-card__score-btn').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  // Default scores are 0:0 — picker visible; set to 1:0 to hide it
  await dialog.locator('.stepper__step').filter({ hasText: '+' }).first().click()
  await expect(dialog.locator('.score-dialog__penalties')).not.toBeVisible()
})

test('penalty winner section appears for a tied knockout score', async ({ page }) => {
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value as string),
    [STORAGE_KEY, storedState(allGroupResults())],
  )
  await page.goto('/knockout')
  await page.locator('.bracket-round').first().locator('.match-card').first().locator('.match-card__score-btn').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  // Scores are 0:0 by default → both teams tied → picker should show
  await expect(dialog.locator('.score-dialog__penalties')).toBeVisible()
  await expect(dialog.getByRole('group', { name: /Elfmeterschießen/ })).toBeVisible()
})

test('saving a tied knockout result with penalty winner propagates bracket', async ({ page }) => {
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value as string),
    [STORAGE_KEY, storedState(allGroupResults())],
  )
  await page.goto('/knockout')

  // Open the first R32 card (M73: A2 vs B2)
  await page.locator('.bracket-round').first().locator('.match-card').first().locator('.match-card__score-btn').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  // Leave score at 0:0 (draw) and pick home team as penalty winner
  const penaltyGroup = dialog.getByRole('group', { name: /Elfmeterschießen/ })
  await expect(penaltyGroup).toBeVisible()
  const penaltyBtns = penaltyGroup.getByRole('button')
  await penaltyBtns.first().click() // pick home team
  await expect(penaltyBtns.first()).toHaveAttribute('aria-pressed', 'true')

  await dialog.getByRole('button', { name: 'Speichern' }).click()
  await expect(dialog).not.toBeVisible()

  // M90 (R16) homeRef = winner(M73) — home team should now be resolved
  // M90 sorts to position 0 in R16 (earlier kickoff than M89).
  const m90card = page.locator('.bracket-round').nth(1).locator('.match-card').nth(0)
  await expect(m90card.locator('.team-label')).toHaveCount(1)
})

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

test('knockout view has no detectable accessibility violations', async ({ page }) => {
  await page.goto('/knockout')
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])
})

test('knockout view with group results has no detectable accessibility violations', async ({ page }) => {
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value as string),
    [STORAGE_KEY, storedState(allGroupResults())],
  )
  await page.goto('/knockout')
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])
})
