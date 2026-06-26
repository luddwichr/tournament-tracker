// Domain model for the World Cup 2026 result tracker.
//
// All identifiers and comments are English; only user-facing strings (team
// names in `src/data/teams.ts`) are German. See IMPL_PLAN.md → "Domain model".
//
// Everything in the app is *derived* from two static inputs (`teams.ts`,
// `fixtures-2026.ts`) plus one piece of mutable state: a map of match results.

/**
 * The twelve group identifiers, A through L. `GroupId` is derived from this
 * array so the runtime list and the type can never drift apart.
 */
export const GROUP_IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const

export type GroupId = (typeof GROUP_IDS)[number]

/** Tournament stage of a match slot. */
export type Stage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final'

export interface Team {
  /** Stable id, lower-case FIFA country code (e.g. `'ger'`, `'eng'`). */
  id: string
  /** German display name (e.g. `'Deutschland'`). */
  name: string
  /** `flag-icons` CSS code, e.g. `'de'`, `'gb-eng'`. */
  flagCode: string
  /** Group the team was drawn into. */
  group: GroupId
  /**
   * FIFA World Ranking position (snapshot — see header of `teams.ts`).
   * Used as the deterministic last-resort group tiebreaker.
   */
  fifaRanking: number
}

export interface Player {
  number: number
  name: string
  position?: 'GK' | 'DF' | 'MF' | 'FW'
}

/**
 * One of the eight slots in the round of 32 that is filled by a third-placed
 * team. Which group's third-placed team lands in which slot depends on *which*
 * eight groups produce a qualifying third-placed team — resolved through the
 * FIFA allocation table (`THIRD_PLACE_ALLOCATION` in `fixtures-2026.ts`).
 */
export type ThirdPlaceSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

/**
 * A reference to a team that may not be known yet. Group matches reference
 * concrete teams (`team`); knockout matches reference the outcome of the group
 * stage or of earlier knockout matches and are resolved on demand.
 */
export type TeamRef =
  | { kind: 'team'; teamId: string }
  | { kind: 'groupRank'; group: GroupId; rank: 1 | 2 }
  | { kind: 'thirdPlace'; slot: ThirdPlaceSlot }
  | { kind: 'matchWinner'; matchId: string }
  | { kind: 'matchLoser'; matchId: string } // only for the third-place play-off

export interface MatchSlot {
  /** Stable id, e.g. `'M01'` (group) … `'M104'` (final). */
  id: string
  stage: Stage
  /** Present for group-stage matches only. */
  group?: GroupId
  /** Kickoff as an ISO 8601 string with the venue's UTC offset. */
  kickoff: string
  homeRef: TeamRef
  awayRef: TeamRef
}

export interface Result {
  matchId: string
  homeGoals: number
  awayGoals: number
  // Discipline counts feed the FIFA fair-play tiebreaker.
  // See docs/tiebreakers.md (and docs/tournament-rules.md) for the rule.
  homeYellow: number
  homeRed: number // includes second-yellow send-offs
  awayYellow: number
  awayRed: number
}

/** Persisted state: results keyed by match id, plus a schema version. */
export interface PersistedState {
  version: number
  results: Record<string, Result>
}
