import { test, expect } from '@playwright/test'
import { KnockoutPage, allGroupResults, clearResults, expectNoA11yViolations, seedResults } from './support'

const { R32, R16 } = KnockoutPage

let knockout: KnockoutPage

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await clearResults(page)
  knockout = new KnockoutPage(page)
})

// ---------------------------------------------------------------------------
// Button visibility
// ---------------------------------------------------------------------------

test('each R32 card has a "Mögliche Teams" button when no results entered', async () => {
  await knockout.goto()
  await knockout.waitForRound(R32)
  // 16 R32 matches × 2 unresolved team slots each = 32 buttons
  await expect(knockout.possibleTeamsButtons(R32)).toHaveCount(32)
})

test('"Mögliche Teams" buttons disappear from R32 once all group results are entered', async ({ page }) => {
  await seedResults(page, allGroupResults())
  await knockout.goto()
  // All R32 participants now known — buttons should be gone
  await expect(knockout.possibleTeamsButtons(R32)).toHaveCount(0)
})

// ---------------------------------------------------------------------------
// Dialog opens and shows teams
// ---------------------------------------------------------------------------

test('clicking "Mögliche Teams" opens a dialog listing possible teams', async () => {
  await knockout.goto()
  await knockout.openPossibleTeamsDialog(R32)
})

test('the possible-teams dialog lists team names with flags', async () => {
  await knockout.goto()
  const dialog = await knockout.openPossibleTeamsDialog(R32)

  // The dialog must contain at least one team name (non-empty list)
  const firstItem = dialog.items().first()
  await expect(firstItem).toBeVisible()

  // Each item has a flag (role="img") and a team name
  await expect(firstItem.getByRole('img')).toBeVisible()
  await expect(dialog.teamName(firstItem)).not.toBeEmpty()
})

test('dialog shows only the possible teams for the clicked slot (home side of M73)', async () => {
  // M73 is A2 vs B2. Clicking the home-slot button shows only the 4 possible home teams (group A).
  await knockout.goto()
  const dialog = await knockout.openPossibleTeamsDialog(R32)
  // First button = home placeholder → 4 possible teams from group A only
  await expect(dialog.items()).toHaveCount(4)
})

// ---------------------------------------------------------------------------
// Dialog close
// ---------------------------------------------------------------------------

test('Escape closes the possible-teams dialog', async () => {
  await knockout.goto()
  const dialog = await knockout.openPossibleTeamsDialog(R32)
  await dialog.closeWithEscape()
  await dialog.expectHidden()
})

test('close button (✕) closes the possible-teams dialog', async () => {
  await knockout.goto()
  const dialog = await knockout.openPossibleTeamsDialog(R32)
  await dialog.closeWithButton()
  await dialog.expectHidden()
})

// ---------------------------------------------------------------------------
// Partial results: partially-played bracket shows narrowed-down possible teams
// ---------------------------------------------------------------------------

test('R16 "Mögliche Teams" dialog lists teams from correct upstream R32 matches', async ({ page }) => {
  // Seed all group results so R32 is populated. Leave R32 unplayed so R16 slots
  // are still unresolved.
  await seedResults(page, allGroupResults())
  await knockout.goto()

  const dialog = await knockout.openPossibleTeamsDialog(R16)

  // Clicking the home-slot button of M90 shows only 2 possible teams:
  // the winner of M73 (A2 or B2) — both R32 participants are known but M73 is unplayed.
  await expect(dialog.items()).toHaveCount(2)
})

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

test('possible-teams dialog has no accessibility violations', async ({ page }) => {
  await knockout.goto()
  await knockout.openPossibleTeamsDialog(R32)
  await expectNoA11yViolations(page)
})

test('knockout view with possible-teams buttons has no accessibility violations', async ({ page }) => {
  await knockout.goto()
  await expectNoA11yViolations(page)
})
