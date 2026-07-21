import { GroupsPage, expectNoA11yViolations } from './support'
import { expect, test } from '@playwright/test'
import { GROUP_IDS } from '../src/types/tournament'
import { teams } from '../src/data/teams'

let groups: GroupsPage

test.beforeEach(async ({ page }) => {
  groups = new GroupsPage(page)
  await groups.goto()
})

test('shows all 12 group headings', async () => {
  for (const groupId of GROUP_IDS) {
    await expect(groups.groupHeading(groupId)).toBeVisible()
  }
})

test('shows all 4 team names of a group', async () => {
  // Scoped to a single group's standings table, where each team name appears
  // exactly once, one row per team.
  // So no strict-mode-dodging `.first()` is needed.
  // There is also no need to check all 48 teams across the page to prove names render correctly.
  for (const team of teams.filter((t) => t.group === 'A')) {
    await expect(groups.standings('A').getByText(team.name, { exact: true })).toBeVisible()
  }
})

test('each group has exactly 4 team rows and 6 match cards', async () => {
  for (const groupId of GROUP_IDS) {
    await expect(groups.teamRows(groupId)).toHaveCount(4)
    await expect(groups.matchCards(groupId)).toHaveCount(6)
  }
})

test('groups view has no detectable accessibility violations', async ({ page }) => {
  await expectNoA11yViolations(page)
})

test('score dialog has no detectable accessibility violations', async ({ page }) => {
  // M25 in Group A is Tschechien vs Südafrika, an as-yet-unplayed match.
  // So the dialog opens in its default state of 0:0 with no draw-guard error.
  await groups.openScoreDialog('Tschechien', 'Südafrika')

  await expectNoA11yViolations(page)
})

test('shows a third-place table with 12 rows, one per group', async () => {
  await expect(groups.thirdPlaceTable()).toBeVisible()
  await expect(groups.thirdPlaceRows()).toHaveCount(12)
})

test('the third-place tiebreaker explainer can be expanded', async ({ page }) => {
  const summary = groups.thirdPlaceTable().getByText('Wie wird das entschieden?')
  await summary.click()
  await expect(page.getByText('geschossenen Tore')).toBeVisible()
})

// Primary user journey: enter a score through the UI and see the standings
// table re-rank accordingly (rather than only verifying persistence via
// localStorage seeding).

test('entering a score via the stepper dialog re-ranks the standings table', async () => {
  // M25 (Group A): Tschechien (home, FIFA #40) vs Südafrika (away, FIFA #60).
  // With no results yet, standings order is by FIFA ranking: Mexiko, Südkorea,
  // Tschechien, Südafrika, so Südafrika sits last.
  await expect(groups.teamRows('A').last()).toContainText('Südafrika')

  const dialog = await groups.openScoreDialog('Tschechien', 'Südafrika')

  // Bump Südafrika's away goals twice via its own "+" stepper button.
  // It is targeted by aria-label, so this can't accidentally increment the home team's stepper instead.
  await dialog.incrementGoals('Südafrika')
  await dialog.incrementGoals('Südafrika')
  await dialog.save()
  await dialog.expectHidden()

  // The match card now shows the entered result.
  await expect(groups.scoredMatchButton('Tschechien', 0, 2, 'Südafrika')).toBeVisible()

  // Südafrika won 2:0.
  // Despite the worst FIFA ranking in the group, it now leads the table on 3 points and +2 goal difference.
  // Tschechien, the loser, drops to the bottom.
  const topRow = groups.teamRows('A').first()
  await expect(topRow).toContainText('Südafrika')
  await expect(topRow.locator('.standings-row__pts')).toHaveText('3')
  await expect(groups.teamRows('A').last()).toContainText('Tschechien')
})
