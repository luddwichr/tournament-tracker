// Domain model for the World Cup 2026 result tracker.
//
// All identifiers and comments are English; only user-facing strings (team
// names in `src/data/teams.ts`) are German.
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
  readonly id: string
  /** German display name (e.g. `'Deutschland'`). */
  readonly name: string
  /** `flag-icons` CSS code, e.g. `'de'`, `'gb-eng'`. */
  readonly flagCode: string
  /** Group the team was drawn into. */
  readonly group: GroupId
  /**
   * FIFA World Ranking position (snapshot — see header of `teams.ts`).
   * Used as the deterministic last-resort group tiebreaker.
   */
  readonly fifaRanking: number
}

export interface Player {
  readonly number: number
  readonly name: string
  readonly position: 'GK' | 'DF' | 'MF' | 'FW'
}

/**
 * One of the eight slots in the round of 32 that is filled by a third-placed
 * team. Which group's third-placed team lands in which slot depends on *which*
 * eight groups produce a qualifying third-placed team — resolved through the
 * FIFA allocation table (`THIRD_PLACE_ALLOCATION` in `fixtures-2026.ts`).
 */
export type ThirdPlaceSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

/**
 * A branded string key for `THIRD_PLACE_ALLOCATION` — the eight qualifying
 * group letters sorted and joined (e.g. `'ABCEFGHI'`). Branding prevents
 * unsorted or otherwise malformed strings from indexing the table silently.
 * Construct via `toThirdPlaceKey(groups)`.
 */
export type ThirdPlaceKey = string & { readonly _thirdPlaceKeyBrand: never }

/** Build a valid `ThirdPlaceKey` from an array of group ids. */
export function toThirdPlaceKey(groups: GroupId[]): ThirdPlaceKey {
  return groups.toSorted().join('') as ThirdPlaceKey
}

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

/** A `TeamRef` already resolved to a concrete team — what group matches always have. */
export type ResolvedTeamRef = Extract<TeamRef, { kind: 'team' }>

interface BaseMatchSlot {
  /** Stable id, e.g. `'M01'` (group) … `'M104'` (final). */
  readonly id: string
  /** Kickoff as an ISO 8601 string with the venue's UTC offset. */
  readonly kickoff: string
}

/**
 * A group-stage match. Both sides are always concrete teams — there is
 * nothing to resolve — so `homeRef`/`awayRef` are narrowed to
 * `ResolvedTeamRef` and `group` is non-optional, instead of that invariant
 * living only in comments and being re-checked at every call site.
 */
export interface GroupMatchSlot extends BaseMatchSlot {
  readonly stage: 'group'
  readonly group: GroupId
  readonly homeRef: ResolvedTeamRef
  readonly awayRef: ResolvedTeamRef
}

/**
 * A knockout-stage match. Either side may reference an outcome that isn't
 * determined yet (group rank, third place, winner/loser of an earlier tie).
 */
export interface KnockoutMatchSlot extends BaseMatchSlot {
  readonly stage: Exclude<Stage, 'group'>
  readonly group?: undefined
  readonly homeRef: TeamRef
  readonly awayRef: TeamRef
}

export type MatchSlot = GroupMatchSlot | KnockoutMatchSlot

export interface Result {
  readonly matchId: string
  /**
   * Goals after regulation and extra time — the real goal count, never
   * including penalty-shootout goals. A level knockout score without shootout
   * goals means "not decided yet" (see `resolveTeamRef` in `knockout.ts`).
   */
  readonly homeGoals: number
  readonly awayGoals: number
  /**
   * Penalty-shootout goals per side. Present only when the match was decided
   * by a shootout: knockout matches only, both fields set together, the
   * regular score level, and the shootout score decisive (enforced in
   * `persistence.ts` and the score form). The UI shows the *folded* score —
   * shootout goals added in, marked "i.E." — via `foldedScore` in
   * `knockout.ts`; stats keep using the real goals (`team-schedule.ts`).
   */
  readonly homeShootoutGoals?: number
  readonly awayShootoutGoals?: number
  // Discipline counts feed the FIFA fair-play tiebreaker.
  // See docs/tournament-rules.md for the rule.
  readonly homeYellow: number
  readonly homeRed: number // includes second-yellow send-offs
  readonly awayYellow: number
  readonly awayRed: number
}

/** Results keyed by match id — the one piece of mutable/persisted app state. */
export type ResultsMap = Readonly<Record<string, Result>>

/** Persisted state: results keyed by match id, plus a schema version. */
export interface PersistedState {
  readonly version: number
  readonly results: ResultsMap
}
