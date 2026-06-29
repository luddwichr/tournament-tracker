import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

/** The squad dialog opened by clicking a team name in a group standings table. */
export class SquadDialog {
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

  table(): Locator {
    return this.root.locator('table')
  }

  playerRows(): Locator {
    return this.root.locator('tbody tr')
  }

  async closeWithEscape(): Promise<void> {
    await this.page.keyboard.press('Escape')
  }

  async closeWithButton(): Promise<void> {
    await this.root.getByRole('button', { name: 'Schließen' }).click()
  }
}
