import type { Locator, Page } from '@playwright/test'
import type { GroupId } from '../../../src/types/tournament'
import { ScoreDialog } from '../dialogs/score-dialog'
import { TeamDialog } from '../dialogs/team-dialog'
import { expect } from '@playwright/test'

/** The group-stage view (`/groups`). */
export class GroupsPage {
  static readonly path = '/groups'
  static readonly heading = 'Gruppen'

  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

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
    return this.group(groupId).getByRole('table', { name: `Tabelle Gruppe ${groupId}` })
  }

  matches(groupId: GroupId): Locator {
    return this.group(groupId).getByRole('region', { name: `Spiele Gruppe ${groupId}` })
  }

  teamRows(groupId: GroupId): Locator {
    return this.standings(groupId).locator('tbody tr')
  }

  matchCards(groupId: GroupId): Locator {
    return this.matches(groupId).locator('.match-card')
  }

  thirdPlaceTable(): Locator {
    return this.page.getByRole('region', { name: 'Beste Drittplatzierte' })
  }

  thirdPlaceRows(): Locator {
    return this.thirdPlaceTable().getByRole('region', { name: 'Rangliste' }).locator('tbody tr')
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

  /** Opens the team dialog for the first team of a group's standings table. */
  async openTeamDialog(groupId: GroupId): Promise<TeamDialog> {
    await this.standings(groupId).getByRole('button').first().click()
    const dialog = new TeamDialog(this.page)
    await dialog.expectVisible()
    return dialog
  }

  /** Opens the score dialog for a not-yet-played match card and waits for it to appear. */
  async openScoreDialog(home: string, away: string): Promise<ScoreDialog> {
    await this.emptyMatchButton(home, away).click()
    const dialog = new ScoreDialog(this.page)
    await dialog.expectVisible()
    return dialog
  }
}
