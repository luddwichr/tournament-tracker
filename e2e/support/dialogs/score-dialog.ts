import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * The result-entry dialog opened from a knockout match card. Encapsulates the
 * score stepper, the penalty-shootout winner picker and the save action.
 */
export class ScoreDialog {
  readonly root: Locator

  constructor(private readonly page: Page) {
    this.root = page.getByRole('dialog')
  }

  async expectVisible(): Promise<void> {
    await expect(this.root).toBeVisible()
  }

  async expectHidden(): Promise<void> {
    await expect(this.root).not.toBeVisible()
  }

  title(): Locator {
    return this.root.locator('.base-dialog__title')
  }

  /** Clicks the first "+" stepper button, bumping the home goals by one. */
  async incrementHomeGoals(): Promise<void> {
    await this.root.locator('.stepper__step').filter({ hasText: '+' }).first().click()
  }

  /** The penalty-shootout winner picker, only visible for a tied score. */
  penalties(): Locator {
    return this.root.locator('.score-dialog__penalties')
  }

  penaltyGroup(): Locator {
    return this.root.getByRole('group', { name: /Elfmeterschießen/ })
  }

  penaltyButtons(): Locator {
    return this.penaltyGroup().getByRole('button')
  }

  /** Picks the home team as the penalty-shootout winner. */
  async pickHomePenaltyWinner(): Promise<void> {
    await this.penaltyButtons().first().click()
  }

  async save(): Promise<void> {
    await this.root.getByRole('button', { name: 'Speichern' }).click()
  }

  async closeWithEscape(): Promise<void> {
    await this.page.keyboard.press('Escape')
  }
}
