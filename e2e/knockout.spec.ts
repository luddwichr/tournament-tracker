import {
  KnockoutPage,
  allGroupResults,
  clearResultsOnLoad,
  expectNoA11yViolations,
  makeResult,
  seedResultsOnLoad,
} from './support'
import { expect, test } from '@playwright/test'
import { knockoutMatches } from '../src/data/fixtures-2026'

const { R32 } = KnockoutPage

let knockout: KnockoutPage

test.beforeEach(async ({ page }) => {
  await clearResultsOnLoad(page)
  knockout = new KnockoutPage(page)
})

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

test('shows all 5 round headings', async () => {
  await knockout.goto()
  for (const title of ['Runde der 32', 'Achtelfinale', 'Viertelfinale', 'Halbfinale', 'Finale']) {
    await expect(knockout.roundHeading(title)).toBeVisible()
  }
})

test('renders 32 match cards in total', async () => {
  await knockout.goto()
  await expect(knockout.allMatchCards()).toHaveCount(32)
})

test('final column shows section labels for both end-stage matches', async () => {
  await knockout.goto()
  const labels = knockout.sectionLabels()
  await expect(labels).toHaveCount(2)
  await expect(labels.nth(0)).toContainText('Spiel um Platz 3')
  await expect(labels.nth(1)).toContainText('Finale')
})

// ---------------------------------------------------------------------------
// Placeholder labels
// ---------------------------------------------------------------------------

test('placeholder labels are meaningful — no bare "?" shown', async () => {
  await knockout.goto()
  await knockout.waitForRound(R32)
  const placeholders = knockout.placeholders()
  const count = await placeholders.count()
  expect(count).toBeGreaterThan(0)
  for (const text of await placeholders.allTextContents()) {
    expect(text.trim()).not.toBe('?')
  }
})

test('R32 group-rank placeholders include "Gruppe" and the group letter', async () => {
  await knockout.goto()
  // M73 is A2 vs B2 — first card in R32 column
  const texts = await knockout.round(R32).locator('.match-team-slot__placeholder').allTextContents()
  // Both placeholders should mention a group letter
  for (const t of texts) {
    expect(t).toMatch(/Gruppe [A-L]/)
  }
})

// ---------------------------------------------------------------------------
// Disabled / enabled state
// ---------------------------------------------------------------------------

test('all 16 R32 cards are disabled without group results', async () => {
  await knockout.goto()
  await expect(knockout.disabledScoreButtons(R32)).toHaveCount(16)
})

test('all 16 R32 cards become enabled after all group results are entered', async ({ page }) => {
  await seedResultsOnLoad(page, allGroupResults())
  await knockout.goto()
  // No disabled R32 cards
  await expect(knockout.disabledScoreButtons(R32)).toHaveCount(0)
  await expect(knockout.round(R32).locator('.match-card')).toHaveCount(16)
})

// ---------------------------------------------------------------------------
// ScoreDialog interaction
// ---------------------------------------------------------------------------

test('clicking an enabled R32 card opens ScoreDialog with resolved team names', async ({ page }) => {
  await seedResultsOnLoad(page, allGroupResults())
  await knockout.goto()

  // M73 is A2 vs B2 — the first R32 match
  const dialog = await knockout.openScoreDialog('M73')
  const text = await dialog.title().textContent()
  // Title must name two real teams, not generic fallback strings
  expect(text).toMatch(/Ergebnis: .+ – .+/)
  expect(text).not.toContain('Heim')
  expect(text).not.toContain('Gast')
})

test('Escape closes the ScoreDialog', async ({ page }) => {
  await seedResultsOnLoad(page, allGroupResults())
  await knockout.goto()

  const dialog = await knockout.openScoreDialog('M73')
  await dialog.closeWithEscape()
  await dialog.expectHidden()
})

test('entering a knockout result propagates to the next round', async ({ page }) => {
  await seedResultsOnLoad(page, allGroupResults())
  await knockout.goto()

  // Enter a result for the first R32 match (M73: A2 vs B2)
  const dialog = await knockout.openScoreDialog('M73')
  const { home } = await dialog.teamNames()
  await dialog.incrementGoals(home)
  await dialog.save()
  await dialog.expectHidden()

  // M73 winner (A2, home win) should now appear as the resolved home team in M90
  // M90 homeRef = winner(M73), awayRef = winner(M75) — M75 still unresolved
  const m90card = knockout.matchCard('M90')
  await expect(m90card.locator('.team-label')).toHaveCount(1)
  await expect(m90card.locator('.match-team-slot__placeholder')).toHaveCount(1)
})

// ---------------------------------------------------------------------------
// Knockout draw guard
// ---------------------------------------------------------------------------

test('saving a tied knockout score shows a draw error and keeps the dialog open', async ({ page }) => {
  await seedResultsOnLoad(page, allGroupResults())
  await knockout.goto()
  const dialog = await knockout.openScoreDialog('M73')

  // Default score is 0:0 — a knockout match cannot end in a draw
  await dialog.save()
  await expect(dialog.drawError()).toBeVisible()
  await dialog.expectVisible()
})

test('the draw error clears once the score is no longer tied, then the result saves', async ({ page }) => {
  await seedResultsOnLoad(page, allGroupResults())
  await knockout.goto()

  // Open the first R32 card (M73: A2 vs B2) and trigger the draw error
  const dialog = await knockout.openScoreDialog('M73')
  await dialog.save()
  await expect(dialog.drawError()).toBeVisible()

  // Make the score non-tied → error clears and saving now succeeds
  const { home } = await dialog.teamNames()
  await dialog.incrementGoals(home)
  await expect(dialog.drawError()).not.toBeVisible()
  await dialog.save()
  await dialog.expectHidden()

  // M90 homeRef = winner(M73) — home team should now be resolved.
  await expect(knockout.matchCard('M90').locator('.team-label')).toHaveCount(1)
})

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

test('knockout view has no detectable accessibility violations', async ({ page }) => {
  await knockout.goto()
  // Routes are lazily imported (see router.ts) — wait for the view to
  // actually be mounted before scanning, otherwise axe can run against the
  // pre-hydration DOM and misreport a missing level-one heading.
  await knockout.expectLoaded()
  await expectNoA11yViolations(page)
})

test('knockout view with group results has no detectable accessibility violations', async ({ page }) => {
  await seedResultsOnLoad(page, allGroupResults())
  await knockout.goto()
  await knockout.expectLoaded()
  await expectNoA11yViolations(page)
})

// ---------------------------------------------------------------------------
// Scroll to the currently ongoing round on load
// ---------------------------------------------------------------------------

test('does not scroll away from R32 while the group stage is still ongoing', async () => {
  await knockout.goto()
  await knockout.waitForRound(R32)
  expect(await knockout.bracketScrollLeft()).toBe(0)
})

test('scrolls to Halbfinale once R32, R16 and QF are decided', async ({ page }) => {
  const results = allGroupResults()
  for (const m of knockoutMatches.filter(
    (match) => match.stage === 'r32' || match.stage === 'r16' || match.stage === 'qf',
  )) {
    results[m.id] = makeResult(m.id, 2, 1)
  }
  await seedResultsOnLoad(page, results)
  await knockout.goto()

  await expect(knockout.roundHeading('Halbfinale')).toBeInViewport()
  await expect(knockout.roundHeading('Runde der 32')).not.toBeInViewport()
})

test('scrolls to Finale once every knockout match has been decided', async ({ page }) => {
  const results = allGroupResults()
  for (const m of knockoutMatches) {
    results[m.id] = makeResult(m.id, 2, 1)
  }
  await seedResultsOnLoad(page, results)
  await knockout.goto()

  await expect(knockout.roundHeading('Finale')).toBeInViewport()
})
