// Detect knockout results that would silently apply to a different pairing after a group or knockout result is edited
// or cleared.
//
// A `Result` stores only scores, never participants.
// Participants are always derived on demand via `resolveTeamRef` in `knockout.ts`.
// So when editing or clearing `matchId` changes who a later knockout match's `homeRef` or `awayRef` resolve to, any
// result already stored for that later match was entered for a *different* pairing.
// It must be discarded rather than silently reinterpreted.

import { KNOCKOUT_STAGE_LABEL, teamRefLabel } from './bracket-labels'
import type { Result, ResultsMap, TeamRef } from '../types/tournament'
import { fixturesById, knockoutMatches } from '../data/fixtures-2026'
import { resolveTeamRef } from './knockout'

/** Resolve a ref to a team id, or `null` when unresolved, which is a distinct value from any team id. */
function resolvedTeamId(ref: TeamRef, results: ResultsMap): string | null {
  return resolveTeamRef(ref, results)?.id ?? null
}

/** Copy of `results` without the entries for `ids`. */
export function resultsWithout(results: ResultsMap, ids: Iterable<string>): ResultsMap {
  const drop = new Set(ids)
  return Object.fromEntries(Object.entries(results).filter(([id]) => !drop.has(id)))
}

/**
 * Match ids of knockout matches whose stored result would apply to a different pairing if `newResult` replaced the
 * result of `matchId`, or removed it when null.
 * Ids are returned in bracket order (M73 → M104).
 * Cascades are handled by treating a match flagged here as cleared when evaluating later matches.
 *
 * This is not a hot path.
 * It runs once per save or clear click, resolves at most 32 knockout matches, and `computeGroupStandings` behind
 * `groupRank` refs is memoized.
 */
export function invalidatedDownstream(results: ResultsMap, matchId: string, newResult: Result | null): string[] {
  // Working copy with `newResult` applied, or with the entry removed.
  let candidate: ResultsMap = newResult ? { ...results, [matchId]: newResult } : resultsWithout(results, [matchId])

  const invalidated: string[] = []

  // A single forward pass suffices.
  // `knockoutMatches` is already in bracket order (M73…M104), and feeder refs only ever point to earlier matches,
  // which `data.spec.ts` guards.
  // Dropping a flagged match's entry from `candidate` as we go is what makes matchWinner and matchLoser cascades
  // propagate into later rounds.
  for (const m of knockoutMatches) {
    if (m.id === matchId) continue // the edited match's own new value is intentional
    if (!results[m.id]) continue // nothing stored here to invalidate

    const homeChanged = resolvedTeamId(m.homeRef, results) !== resolvedTeamId(m.homeRef, candidate)
    const awayChanged = resolvedTeamId(m.awayRef, results) !== resolvedTeamId(m.awayRef, candidate)

    if (homeChanged || awayChanged) {
      invalidated.push(m.id)
      candidate = resultsWithout(candidate, [m.id])
    }
  }

  return invalidated
}

/**
 * Copy of `results` without knockout entries whose participants cannot be resolved.
 * Bulk writes such as an import or a rehydration carry no record of who a stored knockout result was entered for, so
 * the per-edit check in `invalidatedDownstream` has nothing to compare against.
 * An unresolvable pairing is the one case that is decidable, and it is exactly what a hand-edited or truncated map
 * produces, for example a stored M90 whose feeders are missing.
 *
 * Orphans cascade without extra bookkeeping, because `resolveTeamRef` follows a matchWinner or matchLoser ref into the
 * feeder's own participants and returns null as soon as any step in that chain is unresolvable.
 * A single pass over the untouched map therefore already flags the whole subtree below an orphan.
 *
 * Returns the input itself when nothing is dropped, so callers can detect a change by identity.
 */
export function withResolvableKnockoutResults(results: ResultsMap): ResultsMap {
  const orphaned = knockoutMatches
    .filter((m) => results[m.id])
    .filter((m) => !resolveTeamRef(m.homeRef, results) || !resolveTeamRef(m.awayRef, results))
    .map((m) => m.id)

  return orphaned.length > 0 ? resultsWithout(results, orphaned) : results
}

/**
 * German label for the confirm dialog, for example "Achtelfinale (Spiel 89): Deutschland – Spanien".
 * Participants are resolved under the CURRENT results, which is the old attribution the user is about to discard.
 */
export function invalidatedMatchLabel(matchId: string, results: ResultsMap): string {
  const match = fixturesById.get(matchId)
  if (!match || match.stage === 'group') {
    // invalidatedDownstream only ever returns knockout match ids, so this indicates a caller bug, not bad user data.
    throw new Error(`invalidatedMatchLabel: '${matchId}' is not a knockout match`)
  }

  const stageLabel = KNOCKOUT_STAGE_LABEL[match.stage]
  const number = matchId.slice(1)
  // Imported data can carry a matchId whose fixture participants do not resolve.
  // Fall back to the unresolved-ref label rather than throwing.
  const homeName = resolveTeamRef(match.homeRef, results)?.name ?? teamRefLabel(match.homeRef)
  const awayName = resolveTeamRef(match.awayRef, results)?.name ?? teamRefLabel(match.awayRef)

  return `${stageLabel} (Spiel ${number}): ${homeName} – ${awayName}`
}
