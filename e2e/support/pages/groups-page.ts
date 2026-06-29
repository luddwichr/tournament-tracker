import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import type { GroupId } from '../../../src/types/tournament'
import { SquadDialog } from '../dialogs/squad-dialog'

/** The group-stage view (`/groups`). */
export class GroupsPage {
  static readonly path = '/groups'
  static readonly heading = 'Gruppen'

  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto(GroupsPage.path)
    await this.expectLoaded()
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page.getByRole('heading', { level: 1, name: GroupsPage.heading })).toBeVisible()
  }

  groupHeading(groupId: GroupId): Locator {
    return this.page.getByRole('heading', { level: 2, name: `Gruppe ${groupId}` })
  }

  group(groupId: GroupId): Locator {
    return this.page.getByRole('article', { name: `Gruppe ${groupId}` })
  }

  standings(groupId: GroupId): Locator {
    return this.group(groupId).getByRole('region', { name: 'Tabelle' })
  }

  matches(groupId: GroupId): Locator {
    return this.group(groupId).getByRole('region', { name: 'Spiele' })
  }

  teamRows(groupId: GroupId): Locator {
    return this.standings(groupId).locator('tbody tr')
  }

  matchCards(groupId: GroupId): Locator {
    return this.matches(groupId).locator('.match-card')
  }

  teamName(name: string): Locator {
    return this.page.getByText(name, { exact: true })
  }

  /** Match button aria-label for an already-entered result, e.g. "Mexiko 2 : 1 Südafrika". */
  scoredMatchButton(home: string, homeGoals: number, awayGoals: number, away: string): Locator {
    return this.page.getByRole('button', {
      name: `${home} ${homeGoals} : ${awayGoals} ${away} – Ergebnis bearbeiten`,
    })
  }

  /** Match button aria-label for a not-yet-played match, e.g. "Mexiko – Südafrika". */
  emptyMatchButton(home: string, away: string): Locator {
    return this.page.getByRole('button', { name: `${home} – ${away}: Ergebnis eingeben` })
  }

  /** Opens the squad dialog for the first team of a group's standings table. */
  async openSquadDialog(groupId: GroupId): Promise<SquadDialog> {
    await this.standings(groupId).getByRole('button').first().click()
    const dialog = new SquadDialog(this.page)
    await dialog.expectVisible()
    return dialog
  }
}
