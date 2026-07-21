import { SCHEMA_VERSION, STORAGE_KEY } from '../../src/lib/persistence'
import type { Page } from '@playwright/test'
import type { Result } from '../../src/types/tournament'

export { SCHEMA_VERSION, STORAGE_KEY }

// Reuse the app's own result factories, which are pure TS with no Vue, rather than reimplementing them here.
// A Result-shape change then touches one place.
export { allGroupResults, makeResult } from '../../src/test-support/results'

// `storedState`/`seedResults` write directly to localStorage rather than driving the
// UI, as a fast shortcut to get the app into a "results already entered" state. This
// assumes pinia-plugin-persistedstate's on-disk shape is exactly `{ results }` under
// `STORAGE_KEY` (see src/lib/persistence.ts for the STORAGE_KEY/SCHEMA_VERSION source
// of truth).
// It does not go through the plugin's actual (de)serializer.
// If a future plugin upgrade adds metadata, such as wrapping state or adding a checksum, every seeded test would
// start failing with confusing "element not found" errors instead of a clear shape mismatch. `persistence-contract.spec.ts` guards this assumption by asserting,
// via a real UI action, that the plugin's actual persisted shape still matches what
// `storedState` below produces.
export function storedState(results: Record<string, Result>): string {
  return JSON.stringify({ results })
}

export async function seedResults(page: Page, results: Record<string, Result>): Promise<void> {
  await page.evaluate(
    ([key, value]) => {
      localStorage.setItem(key, value)
    },
    [STORAGE_KEY, storedState(results)] as const,
  )
}

export async function clearResults(page: Page): Promise<void> {
  await page.evaluate((key) => {
    localStorage.removeItem(key)
  }, STORAGE_KEY)
}
