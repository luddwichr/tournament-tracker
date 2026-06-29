import { test, expect } from '@playwright/test'
import { teams } from '../src/data/teams'
import { GROUP_IDS } from '../src/types/tournament'
import { GroupsPage, expectNoA11yViolations } from './support'

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

test('shows all 48 team names', async () => {
  for (const team of teams) {
    await expect(groups.teamName(team.name).first()).toBeVisible()
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
