import type { Download, Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { ConfirmDialog } from '../dialogs/confirm-dialog'

interface ImportFile {
  name: string
  mimeType: string
  buffer: Buffer
}

/** The settings view (`/settings`) — export, reset and import of results. */
export class SettingsPage {
  static readonly path = '/settings'
  static readonly heading = 'Einstellungen'

  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async goto(): Promise<void> {
    await this.page.goto(SettingsPage.path)
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page.getByRole('heading', { level: 1, name: SettingsPage.heading })).toBeVisible()
  }

  /** Clicks "Exportieren" and resolves with the triggered download. */
  async export(): Promise<Download> {
    const downloadPromise = this.page.waitForEvent('download')
    await this.page.getByRole('button', { name: 'Exportieren' }).click()
    return downloadPromise
  }

  /** Opens the reset confirmation dialog. */
  async openResetDialog(): Promise<ConfirmDialog> {
    await this.page.getByRole('button', { name: 'Zurücksetzen' }).click()
    const dialog = new ConfirmDialog(this.page)
    await dialog.expectVisible()
    return dialog
  }

  /** Clicks "Zurücksetzen", then confirms in the dialog. */
  async resetAndConfirm(): Promise<void> {
    const dialog = await this.openResetDialog()
    await dialog.click('Zurücksetzen')
  }

  /** Selects a file in the import input, surfacing the confirmation dialog. */
  async chooseImportFile(file: ImportFile): Promise<ConfirmDialog> {
    await this.page.locator('input[type="file"]').setInputFiles(file)
    return new ConfirmDialog(this.page)
  }

  /** Imports a file and confirms the replace prompt. */
  async importAndReplace(file: ImportFile): Promise<void> {
    const dialog = await this.chooseImportFile(file)
    await dialog.click('Ersetzen')
  }

  alert(): Locator {
    return this.page.getByRole('alert')
  }

  /** The entries listed in the Diagnose section's error log. */
  errorLogEntries(): Locator {
    return this.page.locator('.settings-view__log-entry')
  }

  /** The Diagnose section's empty-state message. */
  errorLogEmptyState(): Locator {
    return this.page.getByText('Keine Fehler aufgezeichnet.')
  }

  /** Clicks "Protokoll löschen" in the Diagnose section. */
  async clearErrorLog(): Promise<void> {
    await this.page.getByRole('button', { name: 'Protokoll löschen' }).click()
  }
}
