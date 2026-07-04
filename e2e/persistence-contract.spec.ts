import { test, expect } from '@playwright/test'
import { GroupsPage, ScoreDialog, STORAGE_KEY, clearResults, storedState } from './support'

let groups: GroupsPage

test.beforeEach(async ({ page }) => {
  groups = new GroupsPage(page)
  await groups.goto()
  await clearResults(page)
})

// Canary for the raw-write shortcut documented above `storedState`/`seedResults` in
// e2e/support/results.ts: those helpers write `{ results }` straight into
// localStorage, assuming that's exactly what pinia-plugin-persistedstate itself
// persists. This test performs a real UI action (no localStorage writes) and reads
// the value the plugin actually wrote, so a future plugin upgrade that changes the
// on-disk shape (wrapping state, adding metadata, …) fails loudly here instead of
// producing confusing failures across every seeded test.
test('the plugin persists results in the exact shape seedResults()/storedState() assume', async ({ page }) => {
  // M01: Mexiko vs Südafrika (Group A) — enter a result through the real UI.
  await groups.emptyMatchButton('Mexiko', 'Südafrika').click()
  const dialog = new ScoreDialog(page)
  await dialog.expectVisible()
  await dialog.incrementGoals('Mexiko')
  await dialog.save()
  await dialog.expectHidden()

  await expect(groups.scoredMatchButton('Mexiko', 1, 0, 'Südafrika')).toBeVisible()

  const raw = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
  expect(raw).not.toBeNull()

  const parsed = JSON.parse(raw!) as { results: Record<string, unknown> }

  // Shape assumed by storedState(): a single top-level `results` key, nothing else.
  expect(Object.keys(parsed)).toEqual(['results'])
  expect(parsed.results['M01']).toMatchObject({
    matchId: 'M01',
    homeGoals: 1,
    awayGoals: 0,
    homeYellow: 0,
    homeRed: 0,
    awayYellow: 0,
    awayRed: 0,
  })

  // The plugin's actual serialization must round-trip through storedState() exactly —
  // this is the literal contract seedResults() depends on.
  expect(raw).toBe(storedState(parsed.results as Record<string, never>))
})
