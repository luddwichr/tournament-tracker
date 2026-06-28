import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'fs/promises'

// M01: Mexiko vs Südafrika (Group A, 2026-06-11)
const SEED_RESULT = {
  matchId: 'M01',
  homeGoals: 2,
  awayGoals: 1,
  homeYellow: 0,
  homeRed: 0,
  awayYellow: 0,
  awayRed: 0,
}

const STORAGE_KEY = 'wc2026:results:v1'

// pinia-plugin-persistedstate format: { results: { ... } }
function storedState(results: Record<string, unknown>): string {
  return JSON.stringify({ results })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/settings')
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY)
})

test('results persist across page reload', async ({ page }) => {
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value as string),
    [STORAGE_KEY, storedState({ M01: SEED_RESULT })],
  )

  await page.goto('/groups')
  await expect(page.getByRole('button', { name: 'Mexiko 2 : 1 Südafrika – Ergebnis bearbeiten' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('button', { name: 'Mexiko 2 : 1 Südafrika – Ergebnis bearbeiten' })).toBeVisible()
})

test('Exportieren downloads a valid JSON file', async ({ page }) => {
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value as string),
    [STORAGE_KEY, storedState({ M01: SEED_RESULT })],
  )

  await page.goto('/settings')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise

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
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value as string),
    [STORAGE_KEY, storedState({ M01: SEED_RESULT })],
  )
  await page.goto('/settings')

  // Step 1: Export
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportieren' }).click()
  const download = await downloadPromise
  const filePath = await download.path()
  const fileContent = await readFile(filePath!, 'utf-8')

  // Step 2: Reset — click settings button, then confirm in the custom dialog
  await page.getByRole('button', { name: 'Zurücksetzen' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Zurücksetzen' }).click()

  // Verify reset cleared results
  await page.goto('/groups')
  await expect(page.getByRole('button', { name: 'Mexiko – Südafrika: Ergebnis eingeben' })).toBeVisible()

  // Step 3: Import — upload file, then confirm in the custom dialog
  await page.goto('/settings')
  await page.locator('input[type="file"]').setInputFiles({
    name: 'wc2026-results.json',
    mimeType: 'application/json',
    buffer: Buffer.from(fileContent),
  })
  await page.getByRole('dialog').getByRole('button', { name: 'Ersetzen' }).click()

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
  await page.goto('/groups')
  await expect(page.getByRole('button', { name: 'Mexiko 2 : 1 Südafrika – Ergebnis bearbeiten' })).toBeVisible()
})

test('Abbrechen on reset dialog leaves results intact', async ({ page }) => {
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value as string),
    [STORAGE_KEY, storedState({ M01: SEED_RESULT })],
  )
  await page.goto('/settings')

  await page.getByRole('button', { name: 'Zurücksetzen' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Abbrechen' }).click()

  await page.goto('/groups')
  await expect(page.getByRole('button', { name: 'Mexiko 2 : 1 Südafrika – Ergebnis bearbeiten' })).toBeVisible()
})

test('Abbrechen on import dialog leaves results intact', async ({ page }) => {
  await page.evaluate(
    ([key, value]) => localStorage.setItem(key, value as string),
    [STORAGE_KEY, storedState({ M01: SEED_RESULT })],
  )
  await page.goto('/settings')

  const emptyResults = JSON.stringify({ version: 1, results: {} })
  await page.locator('input[type="file"]').setInputFiles({
    name: 'empty.json',
    mimeType: 'application/json',
    buffer: Buffer.from(emptyResults),
  })
  await page.getByRole('dialog').getByRole('button', { name: 'Abbrechen' }).click()

  await page.goto('/groups')
  await expect(page.getByRole('button', { name: 'Mexiko 2 : 1 Südafrika – Ergebnis bearbeiten' })).toBeVisible()
})

test('confirm dialog has no detectable accessibility violations', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Zurücksetzen' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()

  expect(results.violations).toEqual([])
})

test('Importieren with invalid JSON shows error', async ({ page }) => {
  await page.goto('/settings')

  await page.locator('input[type="file"]').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('not-valid-json'),
  })

  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('Ungültiges JSON-Format')
})

test('Importieren with wrong version shows error', async ({ page }) => {
  await page.goto('/settings')

  const wrongVersion = JSON.stringify({ version: 99, results: {} })
  await page.locator('input[type="file"]').setInputFiles({
    name: 'wrong-version.json',
    mimeType: 'application/json',
    buffer: Buffer.from(wrongVersion),
  })

  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('Unbekanntes Dateiformat')
})

test('settings page has no detectable accessibility violations', async ({ page }) => {
  await page.goto('/settings')

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()

  expect(results.violations).toEqual([])
})
