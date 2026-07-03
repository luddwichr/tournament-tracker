import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

/** The team dialog opened by clicking a team name in a group standings table. */
export class TeamDialog {
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

  /** The squad roster table, shown on the "Team" tab (selected by default). */
  table(): Locator {
    return this.root.locator('.squad-list')
  }

  playerRows(): Locator {
    return this.table().locator('tbody tr')
  }

  async closeWithEscape(): Promise<void> {
    await this.page.keyboard.press('Escape')
  }

  async closeWithButton(): Promise<void> {
    await this.root.getByRole('button', { name: 'Schließen' }).click()
  }
}
