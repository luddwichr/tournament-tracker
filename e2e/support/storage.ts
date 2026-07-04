import type { Page } from '@playwright/test'
import type { Result } from '../../src/types/tournament'
import { STORAGE_KEY, storedState } from './results'

/**
 * Clears any persisted results before the page's first real navigation, via a
 * context-level init script. Avoids the common `goto('/')` just to get a
 * document loaded so `localStorage.removeItem` has somewhere to run —
 * followed by a second, real `goto(...)`.
 */
export async function clearResultsOnLoad(page: Page): Promise<void> {
  await page.context().addInitScript((key) => {
    window.localStorage.removeItem(key)
  }, STORAGE_KEY)
}

/**
 * Seeds persisted results before the page's first real navigation, via a
 * context-level init script — so the app picks them up on its one real
 * `goto(...)`. Avoids a throwaway `goto('/')` just to get a document loaded
 * so `localStorage.setItem` (as plain `page.evaluate`) has somewhere to run.
 */
export async function seedResultsOnLoad(page: Page, results: Record<string, Result>): Promise<void> {
  const value = storedState(results)
  await page.context().addInitScript(
    ([key, val]) => {
      window.localStorage.setItem(key, val)
    },
    [STORAGE_KEY, value] as const,
  )
}
