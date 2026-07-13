/**
 * Persistent error log backing the global error handlers (review §6.1).
 *
 * Runtime errors are appended to localStorage so they survive the session and
 * can be inspected later in Settings → Diagnose — without this, a crash on a
 * family member's device is a silent white screen the maintainer never hears
 * about.
 *
 * The key and entry shape are duplicated in index.html's inline boot-error
 * script (which must be self-contained ES5 because it exists precisely for
 * browsers that cannot parse the es2025 module bundle). Keep both in sync.
 */

export const ERROR_LOG_KEY = 'wc2026:errors:v1'

/** Cap so a crash loop cannot grow the log unboundedly; oldest entries drop first. */
export const ERROR_LOG_MAX_ENTRIES = 20

export interface ErrorLogEntry {
  /** ISO timestamp of when the error was recorded. */
  time: string
  /** Where the error was caught: Vue's errorHandler, window error/rejection, or the boot script. */
  source: 'vue' | 'window' | 'promise' | 'boot'
  message: string
}

/** Append an entry, dropping the oldest beyond the cap. Storage failures are swallowed. */
export function logError(source: ErrorLogEntry['source'], message: string): void {
  try {
    const entries = readErrorLog()
    entries.push({ time: new Date().toISOString(), source, message })
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(entries.slice(-ERROR_LOG_MAX_ENTRIES)))
  } catch {
    // localStorage full or unavailable — logging must never crash the app.
  }
}

/** Read all logged entries; corrupt or foreign data yields an empty log. */
export function readErrorLog(): ErrorLogEntry[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(ERROR_LOG_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidEntry)
  } catch {
    return []
  }
}

export function clearErrorLog(): void {
  try {
    localStorage.removeItem(ERROR_LOG_KEY)
  } catch {
    // Nothing sensible to do if storage is unavailable.
  }
}

function isValidEntry(value: unknown): value is ErrorLogEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry['time'] === 'string' &&
    (entry['source'] === 'vue' ||
      entry['source'] === 'window' ||
      entry['source'] === 'promise' ||
      entry['source'] === 'boot') &&
    typeof entry['message'] === 'string'
  )
}
