/**
 * Unit tests for possible-teams.ts.
 *
 * Constructed scenario for the "1 match left" test:
 *   Group A teams: mex, kor, cze, rsa
 *   Fixtures (home → away): M01 mex–rsa, M02 kor–cze, M25 cze–rsa,
 *                            M28 mex–kor, M53 cze–mex, M54 rsa–kor
 *
 *   After playing:
 *     M01: mex(h) 3–0 rsa(a)  →  mex +3pts, GD +3
 *     M02: kor(h) 3–0 cze(a)  →  kor +3pts, GD +3
 *     M25: cze(h) 0–0 rsa(a)  →  cze +1pt,  rsa +1pt
 *     M53: cze(h) 0–3 mex(a)  →  mex +3pts, GD +3   (away win: homeGoals=0, awayGoals=3)
 *     M54: rsa(h) 0–3 kor(a)  →  kor +3pts, GD +3   (away win: homeGoals=0, awayGoals=3)
 *
 *   Standings (M28 mex–kor remaining):
 *     mex: 6 pts, GD +6   kor: 6 pts, GD +6
 *     cze: 1 pt,  GD −6   rsa: 1 pt,  GD −6
 *   cze and rsa have played all their matches and cannot improve.
 *   Therefore only mex and kor can reach rank 1.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type { Result, TeamRef } from '../types/tournament'
import { knockoutMatches } from '../data/fixtures-2026'
import { possibleTeamsFor, clearPossibleTeamsCache } from './possible-teams'
import { makeResult, allGroupResults } from '../test-support/results'

beforeEach(() => {
  clearPossibleTeamsCache()
})

/**
 * Build the 5-match Group A scenario where only mex and kor can reach rank 1.
 * M28 (mex vs kor) is intentionally left out.
 */
function groupAFiveMatchResults(): Record<string, Result> {
  return {
    M01: makeResult('M01', 3, 0), // mex(h) 3–0 rsa(a)
    M02: makeResult('M02', 3, 0), // kor(h) 3–0 cze(a)
    M25: makeResult('M25', 0, 0), // cze(h) 0–0 rsa(a)
    M53: makeResult('M53', 0, 3), // cze(h) 0–3 mex(a) — away win
    M54: makeResult('M54', 0, 3), // rsa(h) 0–3 kor(a) — away win
  }
}

// ---------------------------------------------------------------------------
// groupRank: fully played group — deterministic
// ---------------------------------------------------------------------------

describe('possibleTeamsFor — groupRank, all matches played', () => {
  it('returns exactly the team currently at that rank when group is complete', () => {
    // With 1–0 home wins in all 6 group A matches, mex always wins M01, M28, M53
    // and kor always wins M02, M54 and loses M28, giving mex rank 1.
    const results = allGroupResults(1, 0)
    const ref: TeamRef = { kind: 'groupRank', group: 'A', rank: 1 }
    const teams = possibleTeamsFor(ref, results)
    expect(teams.size).toBe(1)
    const team = [...teams][0]!
    expect(team.group).toBe('A')
  })

  it('returns a different team for rank 2', () => {
    const results = allGroupResults(1, 0)
    const rank1 = [...possibleTeamsFor({ kind: 'groupRank', group: 'A', rank: 1 }, results)]
    const rank2 = [...possibleTeamsFor({ kind: 'groupRank', group: 'A', rank: 2 }, results)]
    expect(rank1[0]!.id).not.toBe(rank2[0]!.id)
  })
})

// ---------------------------------------------------------------------------
// groupRank: 1 match remaining — exactly 2 teams reachable for rank 1
// ---------------------------------------------------------------------------

describe('possibleTeamsFor — groupRank, 1 match remaining', () => {
  // The four cases previously here all re-derived the same fact (only mex and
  // kor can still occupy rank 1 or rank 2; cze/rsa have finished and can't
  // catch up) with minor variations — consolidated into one parametrized test.
  it.each([1, 2] as const)(
    'returns exactly mex and kor as possible rank-%i teams (cze/rsa cannot catch up)',
    (rank) => {
      const results = groupAFiveMatchResults()
      const ref: TeamRef = { kind: 'groupRank', group: 'A', rank }
      const teams = possibleTeamsFor(ref, results)
      const ids = [...teams].map((t) => t.id).toSorted()
      expect(ids).toEqual(['kor', 'mex'])
    },
  )
})

// ---------------------------------------------------------------------------
// groupRank: gdSpread cap lift — a team trailing by a large goal difference
// must still be found possible at a rank when only a big swing gets it there.
// ---------------------------------------------------------------------------

describe('possibleTeamsFor — groupRank, gdSpread cap lift', () => {
  it('includes a team trailing by 4 GD that can only reach rank 1 via a big swing in its last match', () => {
    // Group A, 5 of 6 matches played; only M53 (cze vs mex) remains.
    //   M01: mex 0–0 rsa        M28: mex 0–4 kor       M54: rsa 5–0 kor
    //   M25: cze 1–0 rsa        M02: kor 0–0 cze
    // Pre-M53 goal difference: mex −4, rsa +4, kor −1, cze +1 → gdSpread = 8.
    // mex, rsa, kor and cze are then all locked on 4 points once mex wins
    // M53 (mex's only route to 4 points), so that result is compared against
    // rsa — the current GD leader — on overall goal difference (then goals
    // scored). mex's final GD is (−4 + goals scored in M53); to merely tie
    // rsa's fixed GD (+4) mex needs an 8-goal swing — reachable only because
    // maxGoalsPerSide lifts the per-side cap to gdSpread + 1 = 9 (goals
    // 0..8). With the base cap alone (7, i.e. goals 0..6) — or if the lift
    // used gdSpread instead of gdSpread + 1 (an off-by-one) — mex's rank-1
    // scenario (an 8–0 win, which also wins it the goals-scored tiebreaker)
    // would never be enumerated and mex would be silently excluded.
    const results: Record<string, Result> = {
      M01: makeResult('M01', 0, 0),
      M28: makeResult('M28', 0, 4),
      M54: makeResult('M54', 5, 0),
      M25: makeResult('M25', 1, 0),
      M02: makeResult('M02', 0, 0),
      // M53 (cze vs mex) intentionally left unplayed.
    }
    const ref: TeamRef = { kind: 'groupRank', group: 'A', rank: 1 }
    const teams = possibleTeamsFor(ref, results)
    const ids = [...teams].map((t) => t.id)
    expect(ids).toContain('mex')
  })
})

// ---------------------------------------------------------------------------
// groupRank: pathological blowout + several remaining matches must not
// combinatorially explode (regression for REVIEW.md issue 2.1).
//
// A single lopsided scoreline (or typo'd score) inflates gdSpread, and
// `maxGoalsPerSide` lifts the per-side goal cap to `gdSpread + 1` with no
// upper bound. With 5 of Group A's 6 matches still unplayed and only that
// naive lift applied, the per-side cap would be 17 (gdSpread 16 from an 8–0
// win), making the nested score enumeration (17*17)^5 ≈ 2×10^12 leaf calls
// of computeGroupStandings — a multi-hour synchronous freeze, not merely a
// slow test. The fix in `cappedMaxGoalsPerSide` clamps the cap down until
// the total stays near the documented ~1e6-call budget, however large the
// GD swing. This test would time out (well past the assertion below) if that
// clamp were removed or reverted to the unclamped `maxGoalsPerSide`.
// ---------------------------------------------------------------------------

describe('possibleTeamsFor — pathological blowout does not blow up the enumeration', () => {
  it('completes in well under a second even with a huge GD spread and 5 remaining matches', () => {
    // Only M01 played, as an 8–0 blowout: mex +8 GD, rsa −8 GD, kor/cze untouched
    // → gdSpread = 16. The other 5 Group A matches (M02, M25, M28, M53, M54)
    // are all left unplayed, so the naive cap (gdSpread + 1 = 17) applies
    // across all 5 remaining matches simultaneously.
    const results: Record<string, Result> = {
      M01: makeResult('M01', 8, 0),
    }
    const ref: TeamRef = { kind: 'groupRank', group: 'A', rank: 1 }

    const start = Date.now()
    const teams = possibleTeamsFor(ref, results)
    const elapsedMs = Date.now() - start

    // Generous margin — the clamped enumeration should take a few
    // milliseconds; a regression to the unclamped cap would instead hang far
    // beyond any test timeout, so this comfortably distinguishes the two.
    expect(elapsedMs).toBeLessThan(500)
    // Sanity: still returns a real, non-empty result (the fix must not
    // silently degenerate to "no teams possible").
    expect(teams.size).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// groupRank: no matches played — all 4 teams are possible for any rank
// ---------------------------------------------------------------------------

describe('possibleTeamsFor — groupRank, no matches played', () => {
  it('returns all 4 teams as possible rank-1 candidates in an unplayed group', () => {
    const ref: TeamRef = { kind: 'groupRank', group: 'A', rank: 1 }
    const teams = possibleTeamsFor(ref, {})
    expect(teams.size).toBe(4)
    for (const t of teams) expect(t.group).toBe('A')
  })
})

// ---------------------------------------------------------------------------
// thirdPlace
// ---------------------------------------------------------------------------

describe('possibleTeamsFor — thirdPlace', () => {
  it('returns exactly one team for slot 1 when all groups are complete', () => {
    // All groups complete → slot resolves exactly to one team via resolveThirdPlaceSlot.
    const results = allGroupResults(1, 0)
    const ref: TeamRef = { kind: 'thirdPlace', slot: 1 }
    const teams = possibleTeamsFor(ref, results)
    expect(teams.size).toBe(1)
    const [team] = teams
    expect(typeof team!.id).toBe('string')
    expect(team!.id.length).toBeGreaterThan(0)
  })

  it('returns multiple candidate teams for slot 1 when no results exist', () => {
    // Incomplete groups → approximation from the allocation table yields multiple teams.
    const ref: TeamRef = { kind: 'thirdPlace', slot: 1 }
    const teams = possibleTeamsFor(ref, {})
    // Must have at least 2 possible candidates; exact count depends on allocation table
    expect(teams.size).toBeGreaterThanOrEqual(2)
    for (const t of teams) expect(t.group).toBeDefined()
  })

  it('returns different team sets for different slots (slots draw from different source groups)', () => {
    const results = allGroupResults(1, 0)
    const slot1 = [...possibleTeamsFor({ kind: 'thirdPlace', slot: 1 }, results)].map((t) => t.id)
    const slot2 = [...possibleTeamsFor({ kind: 'thirdPlace', slot: 2 }, results)].map((t) => t.id)
    // Slots 1 and 2 can share some teams across allocation combinations but
    // should not be identical since they draw from different host groups.
    expect(slot1).not.toEqual(slot2)
  })
})

// ---------------------------------------------------------------------------
// matchWinner: unplayed match
// ---------------------------------------------------------------------------

describe('possibleTeamsFor — matchWinner, unplayed match', () => {
  it('returns all teams from both upstream groups when M73 is unplayed', () => {
    // M73 homeRef = groupRank(A,2), awayRef = groupRank(B,2)
    // With all group results, A2 and B2 are each exactly one team.
    const results = allGroupResults(1, 0)
    const ref: TeamRef = { kind: 'matchWinner', matchId: 'M73' }
    const teams = possibleTeamsFor(ref, results)
    // One possible home (A2) + one possible away (B2) = 2 distinct teams
    expect(teams.size).toBe(2)
    const groups = [...teams].map((t) => t.group)
    expect(groups).toContain('A')
    expect(groups).toContain('B')
  })

  it('returns 4 teams from groups A and B when neither group has results', () => {
    const ref: TeamRef = { kind: 'matchWinner', matchId: 'M73' }
    const teams = possibleTeamsFor(ref, {})
    // All 4 of A could be rank 2, all 4 of B could be rank 2, union = 8 teams
    expect(teams.size).toBe(8)
  })
})

// ---------------------------------------------------------------------------
// matchWinner: played match — exact resolution
// ---------------------------------------------------------------------------

describe('possibleTeamsFor — matchWinner, played match', () => {
  it('returns only the winner when the match has been played', () => {
    const results = allGroupResults(1, 0)
    // Play M73 with home win
    results['M73'] = makeResult('M73', 2, 1)
    const ref: TeamRef = { kind: 'matchWinner', matchId: 'M73' }
    const teams = possibleTeamsFor(ref, results)
    expect(teams.size).toBe(1)
  })

  it('returns empty set when match result is a draw', () => {
    const results = allGroupResults(1, 0)
    results['M73'] = makeResult('M73', 1, 1)
    const ref: TeamRef = { kind: 'matchWinner', matchId: 'M73' }
    const teams = possibleTeamsFor(ref, results)
    expect(teams.size).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// team kind — always resolves to exactly one team
// ---------------------------------------------------------------------------

describe('possibleTeamsFor — team ref', () => {
  it('returns the exact team for a concrete team ref', () => {
    const ref: TeamRef = { kind: 'team', teamId: 'ger' }
    const teams = possibleTeamsFor(ref, {})
    expect(teams.size).toBe(1)
    expect([...teams][0]!.id).toBe('ger')
  })

  it('returns empty set for an unknown team id', () => {
    const ref: TeamRef = { kind: 'team', teamId: 'zzz_unknown' }
    expect(possibleTeamsFor(ref, {}).size).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Memoization — the cache key must include everything that can change the
// result, in particular discipline (card) counts. Team identity always comes
// from the `teamsById` singleton map regardless of caching, so asserting on
// Team object references (as this suite used to) can't tell a working cache
// apart from no cache at all. Instead, exercise the exact property the
// cache-key comment in possible-teams.ts (via resultFingerprint) worries
// about: two calls with identical scores but different card counts must not
// collide on the same cache key and return a stale result.
// ---------------------------------------------------------------------------

describe('possibleTeamsFor — memoization respects card counts in the cache key', () => {
  it('does not return a stale cached rank-1 team when only card counts change (same scores)', () => {
    // Group A, fully played. mex and kor finish level on points (7), overall
    // GD (+4) and GF (5), and their head-to-head (M28) is a 1–1 draw — a tie
    // all the way to the fair-play score. With no cards, fair play also ties,
    // so FIFA ranking (mex #14 vs kor #25) puts mex at rank 1.
    const baseResults: Record<string, Result> = {
      M01: makeResult('M01', 2, 0), // mex 2–0 rsa
      M02: makeResult('M02', 2, 0), // kor 2–0 cze
      M25: makeResult('M25', 0, 0), // cze 0–0 rsa
      M28: makeResult('M28', 1, 1), // mex 1–1 kor — draw
      M53: makeResult('M53', 0, 2), // cze 0–2 mex — away win
      M54: makeResult('M54', 0, 2), // rsa 0–2 kor — away win
    }
    const ref: TeamRef = { kind: 'groupRank', group: 'A', rank: 1 }
    const first = [...possibleTeamsFor(ref, baseResults)].map((t) => t.id)
    expect(first).toEqual(['mex'])

    // Repeating the exact same call should hit the cache and return identical
    // content (a cheap smoke test that the cache path itself doesn't blow up).
    const repeat = [...possibleTeamsFor(ref, baseResults)].map((t) => t.id)
    expect(repeat).toEqual(first)

    // Same scores, but mex now picks up 2 yellow cards in M28. Fair play
    // (which is checked before FIFA ranking) now favors kor, so kor — not
    // mex — should be rank 1. If the cache key omitted card counts, this
    // call would incorrectly return the stale { mex } result cached above.
    const cardedResults: Record<string, Result> = {
      ...baseResults,
      M28: makeResult('M28', 1, 1, { homeYellow: 2 }),
    }
    const second = [...possibleTeamsFor(ref, cardedResults)].map((t) => t.id)
    expect(second).toEqual(['kor'])
  })
})

// ---------------------------------------------------------------------------
// Deep bracket: matchWinner of matchWinner
// ---------------------------------------------------------------------------

describe('possibleTeamsFor — deep matchWinner chain', () => {
  it('returns R16 possible teams once all group results but no knockout results exist', () => {
    const results = allGroupResults(1, 0)
    // M89: winner(M74) vs winner(M77)
    // M74 and M77 are R32 matches — both unplayed here
    const r16match = knockoutMatches.find((m) => m.stage === 'r16')!
    const ref = r16match.homeRef
    const teams = possibleTeamsFor(ref, results)
    // Some teams should be possible (at least 2: the two R32 participants)
    expect(teams.size).toBeGreaterThanOrEqual(2)
  })
})
