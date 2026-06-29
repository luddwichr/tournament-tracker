import type { Page } from '@playwright/test'
import type { Result } from '../../src/types/tournament'
import { groupMatches } from '../../src/data/fixtures-2026'

export const STORAGE_KEY = 'wc2026:results:v1'

export function makeResult(matchId: string, homeGoals = 1, awayGoals = 0): Result {
  return { matchId, homeGoals, awayGoals, homeYellow: 0, homeRed: 0, awayYellow: 0, awayRed: 0 }
}

export function storedState(results: Record<string, Result>): string {
  return JSON.stringify({ results })
}

export async function seedResults(page: Page, results: Record<string, Result>): Promise<void> {
  await page.evaluate(([key, value]) => localStorage.setItem(key, value as string), [STORAGE_KEY, storedState(results)])
}

export async function clearResults(page: Page): Promise<void> {
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY)
}

export function allGroupResults(homeGoals = 1, awayGoals = 0): Record<string, Result> {
  const results: Record<string, Result> = {}
  for (const m of groupMatches) results[m.id] = makeResult(m.id, homeGoals, awayGoals)
  return results
}
