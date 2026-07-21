import type { Page } from '@playwright/test'

/** Main navigation (the `Hauptnavigation` landmark) link labels per route. */
const NAV_LABELS = {
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
    // Below the 640px breakpoint the link list starts collapsed behind a
    // burger button, see AppHeader.vue.
    // Open it first when present, so nav helpers work on both desktop and mobile-viewport projects.
    const burger = this.page.getByRole('button', { name: 'Navigation öffnen' })
    if (await burger.isVisible()) await burger.click()

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
