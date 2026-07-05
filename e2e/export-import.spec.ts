import { test, expect } from '@playwright/test'
import { readFile } from 'fs/promises'
import {
  GroupsPage,
  STORAGE_KEY,
  SettingsPage,
  clearResults,
  expectNoA11yViolations,
  makeResult,
  seedResults,
} from './support'

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
  const content = JSON.parse(await readFile(filePath!, 'utf-8')) as {
    version: number
    results: Record<string, unknown>
  }
  expect(content.version).toBe(1)
  expect(content.results['M01']).toMatchObject({ homeGoals: 2, awayGoals: 1 })
})

test('export → Zurücksetzen → Importieren restores state', async ({ page }) => {
  // Seed state and load the page so the store picks it up
  await seedResults(page, { M01: SEED_RESULT })
  await settings.goto()

  // Step 1: Export
  const download = await settings.export()
  const filePath = await download.path()
  const fileContent = await readFile(filePath!, 'utf-8')

  // Step 2: Reset — click settings button, then confirm in the custom dialog
  await settings.resetAndConfirm()

  // Verify reset cleared results
  await groups.goto()
  await expect(groups.emptyMatchButton('Mexiko', 'Südafrika')).toBeVisible()

  // Step 3: Import — upload file, then confirm in the custom dialog
  await settings.goto()
  await settings.importAndReplace({
    name: 'wc2026-results.json',
    mimeType: 'application/json',
    buffer: Buffer.from(fileContent),
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

  const emptyResults = JSON.stringify({ version: 1, results: {} })
  const dialog = await settings.chooseImportFile({
    name: 'empty.json',
    mimeType: 'application/json',
    buffer: Buffer.from(emptyResults),
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
  // state — no network request has fired yet, so this is reachable without
  // mocking the sync provider.
  await page.getByRole('button', { name: 'Ergebnisse abrufen' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()

  await expectNoA11yViolations(page)
})

test('Importieren with invalid JSON shows error', async () => {
  await settings.goto()

  await settings.chooseImportFile({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('not-valid-json'),
  })

  await expect(settings.alert()).toBeVisible()
  await expect(settings.alert()).toContainText('Ungültiges JSON-Format')
})

test('Importieren with wrong version shows error', async () => {
  await settings.goto()

  const wrongVersion = JSON.stringify({ version: 99, results: {} })
  await settings.chooseImportFile({
    name: 'wrong-version.json',
    mimeType: 'application/json',
    buffer: Buffer.from(wrongVersion),
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
  await page.getByRole('radio', { name: 'Dunkel' }).check()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await expectNoA11yViolations(page)
})
