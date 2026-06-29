import { test, expect } from '@playwright/test'
import { GroupsPage, expectNoA11yViolations } from './support'

let groups: GroupsPage

test.beforeEach(async ({ page }) => {
  groups = new GroupsPage(page)
  await groups.goto()
})

test('clicking a team name in the standings opens the squad dialog', async () => {
  const dialog = await groups.openSquadDialog('A')
  // Dialog contains a table with player rows
  await expect(dialog.table()).toBeVisible()
})

test('squad dialog shows 26 player rows', async () => {
  const dialog = await groups.openSquadDialog('A')
  await expect(dialog.playerRows()).toHaveCount(26)
})

test('pressing Escape closes the squad dialog', async () => {
  const dialog = await groups.openSquadDialog('A')
  await dialog.closeWithEscape()
  await dialog.expectHidden()
})

test('squad dialog close button works', async () => {
  const dialog = await groups.openSquadDialog('A')
  await dialog.closeWithButton()
  await dialog.expectHidden()
})

test('squad dialog has no accessibility violations', async ({ page }) => {
  await groups.openSquadDialog('A')
  await expectNoA11yViolations(page)
})
