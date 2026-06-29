import type { Result, PersistedState } from '../types/tournament'

export const SCHEMA_VERSION = 1

/**
 * Trigger a browser download of the results as a JSON file.
 * Exported format: `{ version, results }` — see PersistedState.
 */
export function exportJson(results: Record<string, Result>): void {
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
export function parseImport(text: string): Record<string, Result> {
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
  if (typeof obj['results'] !== 'object' || obj['results'] === null) return false
  return Object.values(obj['results'] as Record<string, unknown>).every(isValidResult)
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
  const pw = r['penaltyWinner']
  if (pw !== undefined && pw !== null && pw !== 'home' && pw !== 'away') return false
  return true
}
