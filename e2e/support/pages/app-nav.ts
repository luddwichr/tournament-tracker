import type { Page } from '@playwright/test'

/** Main navigation (the `Hauptnavigation` landmark) link labels per route. */
export const NAV_LABELS = {
  groups: 'Gruppen',
  knockout: 'K.-o.-Runde',
  ranking: 'Weltrangliste',
  settings: 'Einstellungen',
} as const

/** Drives the persistent main navigation via its router links. */
export class AppNav {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  private async click(label: string): Promise<void> {
    await this.page.getByRole('link', { name: label }).click()
  }

  async goToGroups(): Promise<void> {
    await this.click(NAV_LABELS.groups)
  }

  async goToKnockout(): Promise<void> {
    await this.click(NAV_LABELS.knockout)
  }

  async goToRanking(): Promise<void> {
    await this.click(NAV_LABELS.ranking)
  }

  async goToSettings(): Promise<void> {
    await this.click(NAV_LABELS.settings)
  }
}
