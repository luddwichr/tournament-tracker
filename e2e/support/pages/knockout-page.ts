import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { ScoreDialog } from '../dialogs/score-dialog'
import { PossibleTeamsDialog } from '../dialogs/possible-teams-dialog'

/** The knockout-bracket view (`/knockout`). */
export class KnockoutPage {
  static readonly path = '/knockout'
  static readonly heading = 'K.-o.-Runde'

  /** Bracket column indices, in left-to-right render order. */
  static readonly R32 = 0
  static readonly R16 = 1

  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto(KnockoutPage.path)
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page.getByRole('heading', { level: 1, name: KnockoutPage.heading })).toBeVisible()
  }

  roundHeading(name: string): Locator {
    return this.page.getByRole('heading', { level: 2, name, exact: true })
  }

  /** A single bracket-round column by index (use the R32/R16 constants). */
  round(index: number): Locator {
    return this.page.locator('.bracket-round').nth(index)
  }

  async waitForRound(index: number): Promise<void> {
    await this.round(index).waitFor()
  }

  allMatchCards(): Locator {
    return this.page.locator('.match-card')
  }

  matchCard(roundIndex: number, cardIndex: number): Locator {
    return this.round(roundIndex).locator('.match-card').nth(cardIndex)
  }

  sectionLabels(): Locator {
    return this.page.locator('.bracket-round__section-label')
  }

  placeholders(): Locator {
    return this.page.locator('.match-card__placeholder')
  }

  disabledScoreButtons(roundIndex: number): Locator {
    return this.round(roundIndex).locator('.match-card__score-btn[disabled]')
  }

  /**
   * "Mögliche Teams" buttons. Scoped to a round when `roundIndex` is given,
   * otherwise across the whole bracket.
   */
  possibleTeamsButtons(roundIndex?: number): Locator {
    const scope = roundIndex === undefined ? this.page : this.round(roundIndex)
    return scope.getByRole('button', { name: /Mögliche Teams/ })
  }

  /** Opens the score dialog for a match card and waits for it to appear. */
  async openScoreDialog(roundIndex: number, cardIndex: number): Promise<ScoreDialog> {
    await this.matchCard(roundIndex, cardIndex).locator('.match-card__score-btn').click()
    const dialog = new ScoreDialog(this.page)
    await dialog.expectVisible()
    return dialog
  }

  /** Clicks the nth "Mögliche Teams" button in a round and opens its dialog. */
  async openPossibleTeamsDialog(roundIndex: number, buttonIndex = 0): Promise<PossibleTeamsDialog> {
    await this.possibleTeamsButtons(roundIndex).nth(buttonIndex).click()
    const dialog = new PossibleTeamsDialog(this.page)
    await dialog.expectVisible()
    return dialog
  }
}
