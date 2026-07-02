// The boundary between the app and whatever external service supplies match
// results. Everything outside `providers/` depends only on the types here, never
// on a concrete source's JSON shape, so a source can be swapped by adding a new
// `ResultsProvider` implementation.

/** One finished match, normalised to app team ids and non-negative counts. */
export interface SourceMatch {
  homeId: string
  awayId: string
  homeGoals: number
  awayGoals: number
  homeYellow: number
  homeRed: number
  awayYellow: number
  awayRed: number
  /** ISO date (`YYYY-MM-DD`), used to disambiguate rematches. */
  date: string
}

export interface FetchResultsOptions {
  onProgress?: (done: number, total: number) => void
  /** Aborts the in-flight request(s) so a sync can be cancelled. */
  signal?: AbortSignal
  /** Injectable `fetch` for tests; defaults to the global `fetch`. */
  fetchImpl?: typeof fetch
}

export interface ResultsProvider {
  readonly id: string
  /** User-facing label (German). */
  readonly label: string
  /** Rejects with a user-readable German `Error` when the source is unusable. */
  fetchResults(opts?: FetchResultsOptions): Promise<SourceMatch[]>
}
