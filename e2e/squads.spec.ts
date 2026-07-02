import { test, expect } from '@playwright/test'
import { GroupsPage, expectNoA11yViolations } from './support'

let groups: GroupsPage

test.beforeEach(async ({ page }) => {
  groups = new GroupsPage(page)
  await groups.goto()
})

test('clicking a team name in the standings opens the team dialog', async () => {
  const dialog = await groups.openTeamDialog('A')
  // Dialog contains a table with player rows
  await expect(dialog.table()).toBeVisible()
})

test('team dialog shows 26 player rows', async () => {
  const dialog = await groups.openTeamDialog('A')
  await expect(dialog.playerRows()).toHaveCount(26)
})

test('pressing Escape closes the team dialog', async () => {
  const dialog = await groups.openTeamDialog('A')
  await dialog.closeWithEscape()
  await dialog.expectHidden()
})

test('team dialog close button works', async () => {
  const dialog = await groups.openTeamDialog('A')
  await dialog.closeWithButton()
  await dialog.expectHidden()
})

test('team dialog has no accessibility violations', async ({ page }) => {
  await groups.openTeamDialog('A')
  await expectNoA11yViolations(page)
})
