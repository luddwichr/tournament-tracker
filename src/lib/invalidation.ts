// Detect knockout results that would silently apply to a different pairing
// after a group or knockout result is edited or cleared (REVIEW.md §9.1).
//
// A `Result` stores only scores, never participants — participants are always
// derived on demand via `resolveTeamRef` (`knockout.ts`). So when editing (or
// clearing) `matchId` changes who a later knockout match's `homeRef`/`awayRef`
// resolve to, any result already stored for that later match was entered for
// a *different* pairing and must be discarded, not silently reinterpreted.

import type { Result, ResultsMap, TeamRef } from '../types/tournament'
import { fixturesById, knockoutMatches } from '../data/fixtures-2026'
import { KNOCKOUT_STAGE_LABEL } from './team-schedule'
import { resolveTeamRef } from './knockout'
import { teamRefLabel } from './bracket-labels'

/** Resolve a ref to a team id, or `null` when unresolved — `null` is a distinct value from any team id. */
function resolvedTeamId(ref: TeamRef, results: ResultsMap): string | null {
  return resolveTeamRef(ref, results)?.id ?? null
}

/** Copy of `results` without the entries for `ids`. */
export function resultsWithout(results: ResultsMap, ids: Iterable<string>): ResultsMap {
  const drop = new Set(ids)
  return Object.fromEntries(Object.entries(results).filter(([id]) => !drop.has(id)))
}

/**
 * Match ids of knockout matches whose stored result would apply to a different
 * pairing if `newResult` replaced (or, when null, removed) the result of
 * `matchId`. Ids are returned in bracket order (M73 → M104). Cascades:
 * a match flagged here is treated as cleared when evaluating later matches.
 *
 * Performance note: this runs once per save/clear click, resolves at most 32
 * knockout matches, and `computeGroupStandings` behind `groupRank` refs is
 * memoized — no hot-path concern.
 */
export function invalidatedDownstream(results: ResultsMap, matchId: string, newResult: Result | null): string[] {
  // Working copy: `newResult` applied (or the entry removed).
  let candidate: ResultsMap = newResult ? { ...results, [matchId]: newResult } : resultsWithout(results, [matchId])

  const invalidated: string[] = []

  // Single forward pass — `knockoutMatches` is already in bracket order
  // (M73…M104) and feeder refs only ever point to earlier matches (guarded by
  // `data.spec.ts`), so one pass suffices. Dropping a flagged match's entry
  // from `candidate` as we go is what makes matchWinner/matchLoser cascades
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
 * German label for the confirm dialog, e.g.
 * "Achtelfinale (Spiel 89): Deutschland – Spanien" — participants under the
 * CURRENT results (the old attribution the user is about to discard).
 */
export function invalidatedMatchLabel(matchId: string, results: ResultsMap): string {
  const match = fixturesById.get(matchId)
  if (!match || match.stage === 'group') {
    // invalidatedDownstream only ever returns knockout match ids — this
    // would indicate a caller bug, not bad user data.
    throw new Error(`invalidatedMatchLabel: '${matchId}' is not a knockout match`)
  }

  const stageLabel = KNOCKOUT_STAGE_LABEL[match.stage]
  const number = matchId.slice(1)
  // Imported data can carry a matchId whose fixture participants no longer
  // resolve; fall back to the unresolved-ref label rather than throwing.
  const homeName = resolveTeamRef(match.homeRef, results)?.name ?? teamRefLabel(match.homeRef)
  const awayName = resolveTeamRef(match.awayRef, results)?.name ?? teamRefLabel(match.awayRef)

  return `${stageLabel} (Spiel ${number}): ${homeName} – ${awayName}`
}
