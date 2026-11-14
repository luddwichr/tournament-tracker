import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

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

  /**
   * Below the 640px breakpoint the link list starts collapsed behind a burger button, see AppHeader.vue.
   * This opens it when present and still closed, so nav helpers work on both desktop and mobile-viewport projects.
   */
  private async open(): Promise<void> {
    const burger = this.page.getByRole('button', { name: 'Navigation öffnen' })
    if ((await burger.isVisible()) && (await burger.getAttribute('aria-expanded')) !== 'true') await burger.click()
  }

  /**
   * Waits until a collapsible menu has finished closing.
   * Its close transition keeps the list in the layout until the fade ends, so the page height settles only then.
   */
  async expectCollapsed(): Promise<void> {
    const burger = this.page.getByRole('button', { name: 'Navigation öffnen' })
    if (!(await burger.isVisible())) return
    await expect(burger).toHaveAttribute('aria-expanded', 'false')
    await expect(this.page.getByRole('link', { name: NAV_LABELS.groups })).toBeHidden()
  }

  private async click(label: string): Promise<void> {
    await this.open()
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
