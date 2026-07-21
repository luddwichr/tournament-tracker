import type { PersistedState, Result, ResultsMap } from '../types/tournament'
import { fixtures, fixturesById } from '../data/fixtures-2026'

export const SCHEMA_VERSION = 2

/**
 * localStorage key used by the `tournament` store's persistence plugin.
 * This is the single source of truth.
 * It is also imported by `e2e/support/results.ts` so the e2e seed helper can never silently drift from the real key.
 */
export const STORAGE_KEY = `wc2026:results:v${SCHEMA_VERSION}`

/**
 * The outgoing v1 localStorage key, still read once for migration.
 * v1 → v2 needs no field rewrite, because v2 only *added* the optional shootout fields.
 * So a v1 `Result` is a valid v2 `Result`.
 * There is one semantic caveat.
 * v1 stored shootout matches with the penalty goals folded into `homeGoals` and `awayGoals`.
 * That padding is indistinguishable after the fact and is consciously absorbed.
 * Such a match keeps its folded score and reads as decided in regular time.
 */
const LEGACY_STORAGE_KEY = 'wc2026:results:v1'

/** Import-file versions the current code can read (see LEGACY_STORAGE_KEY on v1). */
const READABLE_VERSIONS: ReadonlySet<number> = new Set([1, SCHEMA_VERSION])

/** Every real fixture id, used to reject a results map keyed by an unknown match. */
const VALID_FIXTURE_IDS = new Set(fixtures.map((f) => f.id))

/**
 * Schema-change tripwire.
 * This literal is the runtime shape of a persisted `Result` under the current SCHEMA_VERSION.
 * The `satisfies` clause pins it to the `Result` type.
 * Adding, removing, renaming or retyping a field on `Result` therefore stops this file from compiling.
 * That is deliberate, because persisted data outlives the code that wrote it.
 *
 * Do NOT fix the resulting type error by only editing this literal.
 * Bump SCHEMA_VERSION, keep reading data persisted under the outgoing key and version via a migration, and only then
 * update this shape.
 * That outgoing data lives in both localStorage and `parseImport`.
 * A semantics-only change needs the same treatment even though the compiler cannot see it.
 * Such a change is a field keeping its type but changing meaning.
 */
const PERSISTED_RESULT_FIELDS = {
  awayGoals: 'number',
  awayRed: 'number',
  awayShootoutGoals: 'number?',
  awayYellow: 'number',
  homeGoals: 'number',
  homeRed: 'number',
  homeShootoutGoals: 'number?',
  homeYellow: 'number',
  matchId: 'string',
} as const satisfies {
  [K in keyof Result]-?: Result[K] extends string
    ? 'string'
    : Result[K] extends number
      ? 'number'
      : number extends NonNullable<Result[K]>
        ? 'number?'
        : never
}

/**
 * Trigger a browser download of the results as a JSON file.
 * The exported format is `{ version, results }`, see PersistedState.
 */
export function exportJson(results: ResultsMap): void {
  const payload: PersistedState = { results, version: SCHEMA_VERSION }
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
 * Returns the results map on success.
 * Throws a user-readable Error on failure.
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
  if (typeof obj['version'] !== 'number' || !READABLE_VERSIONS.has(obj['version'])) return false
  return isValidResultsMap(obj['results'])
}

/**
 * Results persisted under the outgoing v1 localStorage key, or null when there are none or they don't validate.
 * This is read-only, so call `clearLegacyResults` once the migration is through.
 * See the store's `afterHydrate` hook for the adopt-then-persist-then-clear order that makes the migration safe
 * against losing data mid-way.
 */
export function readLegacyResults(storage: Pick<Storage, 'getItem'> = localStorage): ResultsMap | null {
  const raw = storage.getItem(LEGACY_STORAGE_KEY)
  if (raw === null) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  // pinia-plugin-persistedstate's on-disk shape is `{ results }`.
  // The version lives in the key rather than the payload, unlike export files.
  const results = (parsed as { results?: unknown } | null)?.results
  return isValidResultsMap(results) ? results : null
}

/**
 * Drop the v1 localStorage entry so the migration is one-shot.
 * Without this, a later `reset()` would resurrect the old data on the next app load.
 */
export function clearLegacyResults(storage: Pick<Storage, 'removeItem'> = localStorage): void {
  storage.removeItem(LEGACY_STORAGE_KEY)
}

/**
 * Validate that `value` is a well-formed results map.
 * That means a plain object keyed only by real fixture ids, where every entry is a structurally valid `Result` whose
 * `matchId` matches the key it's stored under.
 * Arrays are rejected explicitly, since `typeof [] === 'object'` would otherwise slip past a naive check.
 *
 * This is exported so `stores/tournament.ts` can reuse it in the persistence plugin's `afterHydrate` hook.
 * That gives localStorage rehydration the same validation that file import already gets via `parseImport`.
 */
export function isValidResultsMap(value: unknown): value is ResultsMap {
  if (Array.isArray(value) || typeof value !== 'object' || value === null) return false
  return Object.entries(value as Record<string, unknown>).every(
    ([key, result]) => VALID_FIXTURE_IDS.has(key) && isValidResult(result) && result.matchId === key,
  )
}

function isNonNegativeInteger(n: number): boolean {
  // `Number.isInteger` already rejects NaN and ±Infinity, so no separate `Number.isFinite` check is needed.
  return Number.isInteger(n) && n >= 0
}

function isValidResult(value: unknown): value is Result {
  if (typeof value !== 'object' || value === null) return false
  const r = value as Record<string, unknown>
  for (const [field, spec] of Object.entries(PERSISTED_RESULT_FIELDS)) {
    const v = r[field]
    if (spec === 'number?' && v === undefined) continue
    if (typeof v !== (spec === 'string' ? 'string' : 'number')) return false
    if (typeof v === 'number' && !isNonNegativeInteger(v)) return false
  }
  return hasValidShootout(value as Result)
}

/**
 * The `Result` shootout invariants, see `types/tournament.ts`.
 * Both fields must be set together, on knockout matches only, with a level regular score and a decisive shootout.
 * Anything else could make `resolveTeamRef` disagree with the displayed folded score.
 * So it is rejected at the persistence boundary.
 */
function hasValidShootout(result: Result): boolean {
  const home = result.homeShootoutGoals
  const away = result.awayShootoutGoals
  if (home === undefined && away === undefined) return true
  if (home === undefined || away === undefined) return false
  const fixture = fixturesById.get(result.matchId)
  if (!fixture || fixture.stage === 'group') return false
  return result.homeGoals === result.awayGoals && home !== away
}
