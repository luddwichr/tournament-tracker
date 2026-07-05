import type { Result, ResultsMap, PersistedState } from '../types/tournament'
import { fixtures } from '../data/fixtures-2026'

export const SCHEMA_VERSION = 1

/**
 * localStorage key used by the `tournament` store's persistence plugin.
 * Single source of truth — also imported by `e2e/support/results.ts` so the
 * e2e seed helper can never silently drift from the real persisted key.
 */
export const STORAGE_KEY = `wc2026:results:v${SCHEMA_VERSION}`

/** Every real fixture id — used to reject a results map keyed by an unknown match. */
const VALID_FIXTURE_IDS = new Set(fixtures.map((f) => f.id))

/**
 * Trigger a browser download of the results as a JSON file.
 * Exported format: `{ version, results }` — see PersistedState.
 */
export function exportJson(results: ResultsMap): void {
  const payload: PersistedState = { version: SCHEMA_VERSION, results }
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const today = new Date().toISOString().slice(0, 10)
  anchor.href = url
  anchor.download = `wc2026-results-${today}.json`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/**
 * Parse and validate an import file's text content.
 * Returns the results map on success; throws a user-readable Error on failure.
 */
export function parseImport(text: string): ResultsMap {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Ungültiges JSON-Format.')
  }
  if (!isValidPersistedState(parsed)) {
    throw new Error('Unbekanntes Dateiformat oder inkompatible Version.')
  }
  return parsed.results
}

function isValidPersistedState(value: unknown): value is PersistedState {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  if (obj['version'] !== SCHEMA_VERSION) return false
  return isValidResultsMap(obj['results'])
}

/**
 * Validate that `value` is a well-formed results map: a plain object (not an
 * array — `typeof [] === 'object'` would otherwise slip past a naive check)
 * keyed only by real fixture ids, where every entry is a structurally valid
 * `Result` whose `matchId` matches the key it's stored under.
 *
 * Exported so `stores/tournament.ts` can reuse it in the persistence plugin's
 * `afterHydrate` hook, giving localStorage rehydration the same validation
 * that file import already gets via `parseImport`.
 */
export function isValidResultsMap(value: unknown): value is ResultsMap {
  if (Array.isArray(value) || typeof value !== 'object' || value === null) return false
  return Object.entries(value as Record<string, unknown>).every(
    ([key, result]) => VALID_FIXTURE_IDS.has(key) && isValidResult(result) && result.matchId === key,
  )
}

function isNonNegativeInteger(n: number): boolean {
  return Number.isFinite(n) && Number.isInteger(n) && n >= 0
}

function isValidResult(value: unknown): value is Result {
  if (typeof value !== 'object' || value === null) return false
  const r = value as Record<string, unknown>
  if (
    typeof r['matchId'] !== 'string' ||
    typeof r['homeGoals'] !== 'number' ||
    typeof r['awayGoals'] !== 'number' ||
    typeof r['homeYellow'] !== 'number' ||
    typeof r['homeRed'] !== 'number' ||
    typeof r['awayYellow'] !== 'number' ||
    typeof r['awayRed'] !== 'number'
  ) {
    return false
  }
  if (
    !isNonNegativeInteger(r['homeGoals'] as number) ||
    !isNonNegativeInteger(r['awayGoals'] as number) ||
    !isNonNegativeInteger(r['homeYellow'] as number) ||
    !isNonNegativeInteger(r['homeRed'] as number) ||
    !isNonNegativeInteger(r['awayYellow'] as number) ||
    !isNonNegativeInteger(r['awayRed'] as number)
  ) {
    return false
  }
  return true
}
