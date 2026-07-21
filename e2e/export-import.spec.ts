import {
  GroupsPage,
  SCHEMA_VERSION,
  STORAGE_KEY,
  SettingsPage,
  clearResults,
  expectNoA11yViolations,
  makeResult,
  seedResults,
} from './support'
import { expect, test } from '@playwright/test'
import { readFile } from 'fs/promises'

// M01: Mexiko vs Südafrika (Group A, 2026-06-11)
const SEED_RESULT = makeResult('M01', 2, 1)

let settings: SettingsPage
let groups: GroupsPage

test.beforeEach(async ({ page }) => {
  settings = new SettingsPage(page)
  groups = new GroupsPage(page)
  await settings.goto()
  await clearResults(page)
})

test('results persist across page reload', async ({ page }) => {
  await seedResults(page, { M01: SEED_RESULT })

  await groups.goto()
  await expect(groups.scoredMatchButton('Mexiko', 2, 1, 'Südafrika')).toBeVisible()

  await page.reload()
  await expect(groups.scoredMatchButton('Mexiko', 2, 1, 'Südafrika')).toBeVisible()
})

test('Exportieren downloads a valid JSON file', async ({ page }) => {
  await seedResults(page, { M01: SEED_RESULT })
  await settings.goto()

  const download = await settings.export()

  expect(download.suggestedFilename()).toMatch(/^wc2026-results-\d{4}-\d{2}-\d{2}\.json$/)

  const filePath = await download.path()
  const content = JSON.parse(await readFile(filePath, 'utf-8')) as {
    version: number
    results: Record<string, unknown>
  }
  expect(content.version).toBe(SCHEMA_VERSION)
  expect(content.results['M01']).toMatchObject({ awayGoals: 1, homeGoals: 2 })
})

test('export → Zurücksetzen → Importieren restores state', async ({ page }) => {
  // Seed state and load the page so the store picks it up
  await seedResults(page, { M01: SEED_RESULT })
  await settings.goto()

  // Step 1: Export
  const download = await settings.export()
  const filePath = await download.path()
  const fileContent = await readFile(filePath, 'utf-8')

  // Step 2 is the reset: click the settings button, then confirm in the custom dialog.
  await settings.resetAndConfirm()

  // Wait for the store to persist the cleared state.
  // Navigating earlier lets the next page load rehydrate the stale results, which is flaky on mobile-chrome CI.
  await page.waitForFunction(
    ([key]) => {
      const stored = localStorage.getItem(key as string)
      if (!stored) return true
      const parsed = JSON.parse(stored) as { results?: Record<string, unknown> }
      return parsed.results?.['M01'] === undefined
    },
    [STORAGE_KEY],
  )

  // Verify reset cleared results
  await groups.goto()
  await expect(groups.emptyMatchButton('Mexiko', 'Südafrika')).toBeVisible()

  // Step 3 is the import: upload the file, then confirm in the custom dialog.
  await settings.goto()
  await settings.importAndReplace({
    buffer: Buffer.from(fileContent),
    mimeType: 'application/json',
    name: 'wc2026-results.json',
  })

  // Wait for the store to persist the imported state
  await page.waitForFunction(
    ([key]) => {
      const stored = localStorage.getItem(key as string)
      if (!stored) return false
      const parsed = JSON.parse(stored) as { results?: Record<string, unknown> }
      return parsed.results?.['M01'] !== undefined
    },
    [STORAGE_KEY],
  )

  // Verify results are restored
  await groups.goto()
  await expect(groups.scoredMatchButton('Mexiko', 2, 1, 'Südafrika')).toBeVisible()
})

test('Abbrechen on reset dialog leaves results intact', async ({ page }) => {
  await seedResults(page, { M01: SEED_RESULT })
  await settings.goto()

  const dialog = await settings.openResetDialog()
  await dialog.click('Abbrechen')

  await groups.goto()
  await expect(groups.scoredMatchButton('Mexiko', 2, 1, 'Südafrika')).toBeVisible()
})

test('Abbrechen on import dialog leaves results intact', async ({ page }) => {
  await seedResults(page, { M01: SEED_RESULT })
  await settings.goto()

  const emptyResults = JSON.stringify({ results: {}, version: 1 })
  const dialog = await settings.chooseImportFile({
    buffer: Buffer.from(emptyResults),
    mimeType: 'application/json',
    name: 'empty.json',
  })
  await dialog.click('Abbrechen')

  await groups.goto()
  await expect(groups.scoredMatchButton('Mexiko', 2, 1, 'Südafrika')).toBeVisible()
})

test('confirm dialog has no detectable accessibility violations', async ({ page }) => {
  await settings.goto()
  await settings.openResetDialog()

  await expectNoA11yViolations(page)
})

test('sync dialog has no detectable accessibility violations', async ({ page }) => {
  await settings.goto()
  // "Ergebnisse abrufen" opens the SyncDialog straight into its 'confirm'
  // state.
  // No network request has fired yet, so this is reachable without mocking the sync provider.
  await page.getByRole('button', { name: 'Ergebnisse abrufen' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()

  await expectNoA11yViolations(page)
})

test('Importieren with invalid JSON shows error', async () => {
  await settings.goto()

  await settings.chooseImportFile({
    buffer: Buffer.from('not-valid-json'),
    mimeType: 'application/json',
    name: 'invalid.json',
  })

  await expect(settings.alert()).toBeVisible()
  await expect(settings.alert()).toContainText('Ungültiges JSON-Format')
})

test('Importieren with wrong version shows error', async () => {
  await settings.goto()

  const wrongVersion = JSON.stringify({ results: {}, version: 99 })
  await settings.chooseImportFile({
    buffer: Buffer.from(wrongVersion),
    mimeType: 'application/json',
    name: 'wrong-version.json',
  })

  await expect(settings.alert()).toBeVisible()
  await expect(settings.alert()).toContainText('Unbekanntes Dateiformat')
})

test('settings page has no detectable accessibility violations', async ({ page }) => {
  await settings.goto()

  await expectNoA11yViolations(page)
})

test('settings page has no detectable accessibility violations in dark theme', async ({ page }) => {
  await settings.goto()
  // eslint-disable-next-line sonarjs/no-forced-browser-interaction -- the native radio is visually replaced by a custom control, so Playwright sees it as not actionable; forcing is the documented way to drive a visually-hidden native input
  await page.getByRole('radio', { name: 'Dunkel' }).check({ force: true })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await expectNoA11yViolations(page)
})
