import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * The generic confirmation dialog used for destructive actions (reset, import
 * replace). Buttons are addressed by their visible label.
 */
export class ConfirmDialog {
  readonly root: Locator

  constructor(page: Page) {
    this.root = page.getByRole('dialog')
  }

  async expectVisible(): Promise<void> {
    await expect(this.root).toBeVisible()
  }

  async click(buttonName: string): Promise<void> {
    await this.root.getByRole('button', { name: buttonName }).click()
  }
}
