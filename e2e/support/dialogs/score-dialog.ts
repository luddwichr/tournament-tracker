import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * The result-entry dialog opened from a knockout match card. Encapsulates the
 * score stepper, the knockout draw-guard error and the save action.
 */
export class ScoreDialog {
  readonly root: Locator
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
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

  /** The draw-guard error, shown when saving a knockout match with a tied score. */
  drawError(): Locator {
    return this.root.getByRole('alert')
  }

  async save(): Promise<void> {
    await this.root.getByRole('button', { name: 'Speichern' }).click()
  }

  async closeWithEscape(): Promise<void> {
    await this.page.keyboard.press('Escape')
  }
}
