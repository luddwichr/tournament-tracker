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

  /**
   * Parses the "home – away" team names out of the dialog title, e.g.
   * "Ergebnis: Mexiko – Südafrika".
   */
  async teamNames(): Promise<{ home: string; away: string }> {
    const text = (await this.title().textContent()) ?? ''
    const match = /Ergebnis: (.+) – (.+)/.exec(text)
    const home = match?.[1]
    const away = match?.[2]
    if (!home || !away) throw new Error(`Could not parse team names from dialog title: "${text}"`)
    return { home, away }
  }

  /**
   * Clicks the "+" stepper for the named team (aria-label
   * "Tor für <Team> hinzufügen"), bumping that team's goals by one. Targeting
   * by team name — rather than the first `.stepper__step` element containing
   * "+" — avoids silently incrementing the wrong side if DOM order changes.
   */
  async incrementGoals(teamName: string): Promise<void> {
    await this.root.getByRole('button', { name: `Tor für ${teamName} hinzufügen` }).click()
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
