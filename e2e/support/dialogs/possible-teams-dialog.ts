import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * The "Mögliche Teams" dialog listing the teams that could still occupy an
 * unresolved knockout slot.
 */
export class PossibleTeamsDialog {
  readonly root: Locator

  constructor(private readonly page: Page) {
    this.root = page.getByRole('dialog', { name: /Mögliche Teams/ })
  }

  async expectVisible(): Promise<void> {
    await expect(this.root).toBeVisible()
  }

  async expectHidden(): Promise<void> {
    await expect(this.root).not.toBeVisible()
  }

  items(): Locator {
    return this.root.locator('.possible-teams-dialog__item')
  }

  teamName(item: Locator): Locator {
    return item.locator('.possible-teams-dialog__team-name')
  }

  async closeWithEscape(): Promise<void> {
    await this.page.keyboard.press('Escape')
  }

  async closeWithButton(): Promise<void> {
    await this.root.getByRole('button', { name: 'Schließen' }).click()
  }
}
