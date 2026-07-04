import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { ScoreDialog } from '../dialogs/score-dialog'
import { PossibleTeamsDialog } from '../dialogs/possible-teams-dialog'

/** The knockout-bracket view (`/knockout`). */
export class KnockoutPage {
  static readonly path = '/knockout'
  static readonly heading = 'K.-o.-Runde'

  /** Bracket round aria-labels/headings, in left-to-right render order. */
  static readonly R32 = 'Runde der 32'
  static readonly R16 = 'Achtelfinale'

  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async goto(): Promise<void> {
    await this.page.goto(KnockoutPage.path)
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page.getByRole('heading', { level: 1, name: KnockoutPage.heading })).toBeVisible()
  }

  roundHeading(name: string): Locator {
    return this.page.getByRole('heading', { level: 2, name, exact: true })
  }

  /** A single bracket-round column by its title (use the R32/R16 constants). */
  round(title: string): Locator {
    return this.page.getByRole('region', { name: title, exact: true })
  }

  async waitForRound(title: string): Promise<void> {
    await this.round(title).waitFor()
  }

  bracketView(): Locator {
    return this.page.locator('.bracket-view')
  }

  async bracketScrollLeft(): Promise<number> {
    return this.bracketView().evaluate((el) => el.scrollLeft)
  }

  allMatchCards(): Locator {
    return this.page.locator('.match-card')
  }

  /** A single match card by its stable `data-match-id`, e.g. "M73". */
  matchCard(matchId: string): Locator {
    return this.page.locator(`[data-match-id="${matchId}"]`)
  }

  sectionLabels(): Locator {
    return this.page.locator('.bracket-round__section-label')
  }

  placeholders(): Locator {
    return this.page.locator('.match-team-slot__placeholder')
  }

  disabledScoreButtons(title: string): Locator {
    return this.round(title).locator('.match-score-btn[disabled]')
  }

  /**
   * "Mögliche Teams" buttons. Scoped to a round when `title` is given,
   * otherwise across the whole bracket.
   */
  possibleTeamsButtons(title?: string): Locator {
    const scope = title === undefined ? this.page : this.round(title)
    return scope.getByRole('button', { name: /Mögliche Teams/ })
  }

  /** Opens the score dialog for a match card (by `data-match-id`) and waits for it to appear. */
  async openScoreDialog(matchId: string): Promise<ScoreDialog> {
    await this.matchCard(matchId).locator('.match-score-btn').click()
    const dialog = new ScoreDialog(this.page)
    await dialog.expectVisible()
    return dialog
  }

  /** Clicks the nth "Mögliche Teams" button in a round and opens its dialog. */
  async openPossibleTeamsDialog(title: string, buttonIndex = 0): Promise<PossibleTeamsDialog> {
    await this.possibleTeamsButtons(title).nth(buttonIndex).click()
    const dialog = new PossibleTeamsDialog(this.page)
    await dialog.expectVisible()
    return dialog
  }
}
