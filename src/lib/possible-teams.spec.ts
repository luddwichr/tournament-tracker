/**
 * Unit tests for possible-teams.ts.
 *
 * Constructed scenario for the "1 match left" test:
 * Group A teams: mex, kor, cze, rsa
 * Fixtures (home → away): M01 mex–rsa, M02 kor–cze, M25 cze–rsa,
 * M28 mex–kor, M53 cze–mex, M54 rsa–kor
 *
 * After playing:
 * M01: mex(h) 3–0 rsa(a)  →  mex +3pts, GD +3
 * M02: kor(h) 3–0 cze(a)  →  kor +3pts, GD +3
 * M25: cze(h) 0–0 rsa(a)  →  cze +1pt,  rsa +1pt
 * M53: cze(h) 0–3 mex(a)  →  mex +3pts, GD +3   (away win: homeGoals=0, awayGoals=3)
 * M54: rsa(h) 0–3 kor(a)  →  kor +3pts, GD +3   (away win: homeGoals=0, awayGoals=3)
 *
 * Standings (M28 mex–kor remaining):
 * mex: 6 pts, GD +6   kor: 6 pts, GD +6
 * cze: 1 pt,  GD −6   rsa: 1 pt,  GD −6
 * cze and rsa have played all their matches and cannot improve.
 * Therefore only mex and kor can reach rank 1.
 */

import type { ResultsMap, TeamRef } from '../types/tournament'
import { allGroupResults, makeResult } from '../test-support/results'
import { beforeEach, describe, expect, it } from 'vitest'
import { freePossibleTeamsMemory, possibleTeamsFor } from './possible-teams'
import { knockoutMatches } from '../data/fixtures-2026'

beforeEach(() => {
  freePossibleTeamsMemory()
})

/**
 * Build the 5-match Group A scenario where only mex and kor can reach rank 1.
 * M28 (mex vs kor) is intentionally left out.
 */
function groupAFiveMatchResults(): ResultsMap {
  return {
    M01: makeResult('M01', 3, 0), // mex(h) 3–0 rsa(a)
    M02: makeResult('M02', 3, 0), // kor(h) 3–0 cze(a)
    M25: makeResult('M25', 0, 0), // cze(h) 0–0 rsa(a)
    M53: makeResult('M53', 0, 3), // cze(h) 0–3 mex(a), away win
    M54: makeResult('M54', 0, 3), // rsa(h) 0–3 kor(a), away win
  }
}

describe('possibleTeamsFor — groupRank, all matches played', () => {
  it('returns exactly the team currently at that rank when group is complete', () => {
    // With 1–0 home wins in all 6 group A matches, mex always wins M01, M28 and M53.
    // kor always wins M02 and M54 but loses M28, which gives mex rank 1.
    const results = allGroupResults(1, 0)
    const ref: TeamRef = { group: 'A', kind: 'groupRank', rank: 1 }
    const teams = possibleTeamsFor(ref, results)
    expect(teams).toHaveLength(1)
    const team = [...teams][0]!
    expect(team.group).toBe('A')
  })

  it('returns a different team for rank 2', () => {
    const results = allGroupResults(1, 0)
    const rank1 = [...possibleTeamsFor({ group: 'A', kind: 'groupRank', rank: 1 }, results)]
    const rank2 = [...possibleTeamsFor({ group: 'A', kind: 'groupRank', rank: 2 }, results)]
    expect(rank1[0]!.id).not.toBe(rank2[0]!.id)
  })
})

describe('possibleTeamsFor — groupRank, 1 match remaining', () => {
  it.each([1, 2] as const)(
    'returns exactly mex and kor as possible rank-%i teams (cze/rsa cannot catch up)',
    (rank) => {
      const results = groupAFiveMatchResults()
      const ref: TeamRef = { group: 'A', kind: 'groupRank', rank }
      const teams = possibleTeamsFor(ref, results)
      const ids = [...teams].map((t) => t.id).toSorted()
      expect(ids).toEqual(['kor', 'mex'])
    },
  )
})

// A team trailing by a large goal difference must still be found possible at a rank when only a big swing gets it
// there.

describe('possibleTeamsFor — groupRank, gdSpread cap lift', () => {
  it('includes a team trailing by 4 GD that can only reach rank 1 via a big swing in its last match', () => {
    // Group A, 5 of 6 matches played, and only M53 (cze vs mex) remains.
    //   M01: mex 0–0 rsa        M28: mex 0–4 kor       M54: rsa 5–0 kor
    //   M25: cze 1–0 rsa        M02: kor 0–0 cze
    // Pre-M53 goal difference: mex −4, rsa +4, kor −1, cze +1, so gdSpread = 8.
    // Once mex wins M53, its only route to 4 points, mex, rsa, kor and cze are all locked on 4 points.
    // That result is compared against rsa, the current GD leader, on overall goal difference and then goals scored.
    // mex's final GD is (−4 + goals scored in M53), so merely tying rsa's fixed GD of +4 needs an 8-goal swing.
    // Such a swing is only reachable because maxGoalsPerSide lifts the per-side cap to gdSpread + 1 = 9.
    // That allows goals 0..8.
    // mex's rank-1 scenario is an 8–0 win, which also wins it the goals-scored tiebreaker.
    // With the base cap alone (7, meaning goals 0..6) that scenario would never be enumerated.
    // The same applies if the lift used gdSpread instead of gdSpread + 1, which would be an off-by-one.
    // Either way mex would be silently excluded.
    const results: ResultsMap = {
      M01: makeResult('M01', 0, 0),
      M02: makeResult('M02', 0, 0),
      M25: makeResult('M25', 1, 0),
      M28: makeResult('M28', 0, 4),
      M54: makeResult('M54', 5, 0),
      // M53 (cze vs mex) intentionally left unplayed.
    }
    const ref: TeamRef = { group: 'A', kind: 'groupRank', rank: 1 }
    const teams = possibleTeamsFor(ref, results)
    const ids = [...teams].map((t) => t.id)
    expect(ids).toContain('mex')
  })
})

// A pathological blowout plus several remaining matches must not combinatorially explode.
//
// A single lopsided scoreline, or a typo'd score, inflates gdSpread.
// `maxGoalsPerSide` then lifts the per-side goal cap to `gdSpread + 1` with no upper bound.
// With 5 of Group A's 6 matches still unplayed and only that naive lift applied, the per-side cap would be 17.
// That comes from a gdSpread of 16 after an 8–0 win.
// The nested score enumeration would then be (17*17)^5 ≈ 2×10^12 leaf calls of computeGroupStandings.
// That is a multi-hour synchronous freeze, not merely a slow test.
// The fix in `cappedMaxGoalsPerSide` clamps the cap down until the total stays near the documented ~1e6-call budget,
// however large the GD swing.
// This test would time out well past the assertion below if that clamp were removed.
// The same happens if it were reverted to the unclamped `maxGoalsPerSide`.

describe('possibleTeamsFor — pathological blowout does not blow up the enumeration', () => {
  it('completes in well under a second even with a huge GD spread and 5 remaining matches', () => {
    // Only M01 is played, as an 8–0 blowout: mex +8 GD, rsa −8 GD, kor and cze untouched, so gdSpread = 16.
    // The other 5 Group A matches (M02, M25, M28, M53, M54) are all left unplayed.
    // So the naive cap (gdSpread + 1 = 17) applies across all 5 remaining matches simultaneously.
    const results: ResultsMap = {
      M01: makeResult('M01', 8, 0),
    }
    const ref: TeamRef = { group: 'A', kind: 'groupRank', rank: 1 }

    const start = Date.now()
    const teams = possibleTeamsFor(ref, results)
    const elapsedMs = Date.now() - start

    // Generous margin, since the clamped enumeration should take a few milliseconds.
    // A regression to the unclamped cap would instead hang far beyond any test timeout.
    // So this comfortably distinguishes the two.
    expect(elapsedMs).toBeLessThan(500)
    // Sanity check that this still returns a real, non-empty result.
    // The fix must not silently degenerate to "no teams possible".
    expect(teams.length).toBeGreaterThan(0)
  })
})

describe('possibleTeamsFor — groupRank, no matches played', () => {
  it('returns all 4 teams as possible rank-1 candidates in an unplayed group', () => {
    const ref: TeamRef = { group: 'A', kind: 'groupRank', rank: 1 }
    const teams = possibleTeamsFor(ref, {})
    expect(teams).toHaveLength(4)
    for (const t of teams) expect(t.group).toBe('A')
  })
})

describe('possibleTeamsFor — thirdPlace', () => {
  it('returns exactly one team for slot 1 when all groups are complete', () => {
    // All groups complete → slot resolves exactly to one team via resolveThirdPlaceSlot.
    const results = allGroupResults(1, 0)
    const ref: TeamRef = { kind: 'thirdPlace', slot: 1 }
    const teams = possibleTeamsFor(ref, results)
    expect(teams).toHaveLength(1)
    const [team] = teams
    expect(typeof team!.id).toBe('string')
    expect(team!.id.length).toBeGreaterThan(0)
  })

  it('returns multiple candidate teams for slot 1 when no results exist', () => {
    // Incomplete groups → approximation from the allocation table yields multiple teams.
    const ref: TeamRef = { kind: 'thirdPlace', slot: 1 }
    const teams = possibleTeamsFor(ref, {})
    // Must have at least 2 possible candidates.
    // The exact count depends on the allocation table.
    expect(teams.length).toBeGreaterThanOrEqual(2)
    for (const t of teams) expect(t.group).toBeDefined()
  })

  it('returns different team sets for different slots (slots draw from different source groups)', () => {
    const results = allGroupResults(1, 0)
    const slot1 = [...possibleTeamsFor({ kind: 'thirdPlace', slot: 1 }, results)].map((t) => t.id)
    const slot2 = [...possibleTeamsFor({ kind: 'thirdPlace', slot: 2 }, results)].map((t) => t.id)
    // Slots 1 and 2 can share some teams across allocation combinations.
    // They should not be identical though, since they draw from different host groups.
    expect(slot1).not.toEqual(slot2)
  })
})

describe('possibleTeamsFor — matchWinner, unplayed match', () => {
  it('returns all teams from both upstream groups when M73 is unplayed', () => {
    // M73 homeRef = groupRank(A,2), awayRef = groupRank(B,2)
    // With all group results, A2 and B2 are each exactly one team.
    const results = allGroupResults(1, 0)
    const ref: TeamRef = { kind: 'matchWinner', matchId: 'M73' }
    const teams = possibleTeamsFor(ref, results)
    // One possible home (A2) + one possible away (B2) = 2 distinct teams
    expect(teams).toHaveLength(2)
    const groups = [...teams].map((t) => t.group)
    expect(groups).toContain('A')
    expect(groups).toContain('B')
  })

  it('returns 4 teams from groups A and B when neither group has results', () => {
    const ref: TeamRef = { kind: 'matchWinner', matchId: 'M73' }
    const teams = possibleTeamsFor(ref, {})
    // All 4 of A could be rank 2, all 4 of B could be rank 2, union = 8 teams
    expect(teams).toHaveLength(8)
  })
})

describe('possibleTeamsFor — matchWinner, played match', () => {
  it('returns only the winner when the match has been played', () => {
    const results = allGroupResults(1, 0)
    // Play M73 with home win
    results['M73'] = makeResult('M73', 2, 1)
    const ref: TeamRef = { kind: 'matchWinner', matchId: 'M73' }
    const teams = possibleTeamsFor(ref, results)
    expect(teams).toHaveLength(1)
  })

  it('returns empty set when match result is a draw', () => {
    const results = allGroupResults(1, 0)
    results['M73'] = makeResult('M73', 1, 1)
    const ref: TeamRef = { kind: 'matchWinner', matchId: 'M73' }
    const teams = possibleTeamsFor(ref, results)
    expect(teams).toHaveLength(0)
  })
})

describe('possibleTeamsFor — team ref', () => {
  it('returns the exact team for a concrete team ref', () => {
    const ref: TeamRef = { kind: 'team', teamId: 'ger' }
    const teams = possibleTeamsFor(ref, {})
    expect(teams).toHaveLength(1)
    expect([...teams][0]!.id).toBe('ger')
  })

  it('returns empty set for an unknown team id', () => {
    const ref: TeamRef = { kind: 'team', teamId: 'zzz_unknown' }
    expect(possibleTeamsFor(ref, {})).toHaveLength(0)
  })
})

// The cache key must include everything that can change the result, in particular discipline (card) counts.
// Team identity always comes from the `teamsById` singleton map regardless of caching.
// Asserting on Team object references therefore cannot tell a working cache apart from no cache at all.
// So this asserts on the property that actually matters, which resultFingerprint is responsible for.
// Two calls with identical scores but different card counts must not collide on the same key and return a stale result.

describe('possibleTeamsFor — memoization respects card counts in the cache key', () => {
  it('does not return a stale cached rank-1 team when only card counts change (same scores)', () => {
    // Group A, fully played.
    // mex and kor finish level on points (7), overall GD (+4) and GF (5), and their head-to-head (M28) is a 1–1 draw.
    // That is a tie all the way down to the fair-play score.
    // With no cards, fair play also ties, so the FIFA ranking (mex #14 vs kor #25) puts mex at rank 1.
    const baseResults: ResultsMap = {
      M01: makeResult('M01', 2, 0), // mex 2–0 rsa
      M02: makeResult('M02', 2, 0), // kor 2–0 cze
      M25: makeResult('M25', 0, 0), // cze 0–0 rsa
      M28: makeResult('M28', 1, 1), // mex 1–1 kor, draw
      M53: makeResult('M53', 0, 2), // cze 0–2 mex, away win
      M54: makeResult('M54', 0, 2), // rsa 0–2 kor, away win
    }
    const ref: TeamRef = { group: 'A', kind: 'groupRank', rank: 1 }
    const first = [...possibleTeamsFor(ref, baseResults)].map((t) => t.id)
    expect(first).toEqual(['mex'])

    // Repeating the exact same call should hit the cache and return identical content.
    // This is a cheap smoke test that the cache path itself doesn't blow up.
    const repeat = [...possibleTeamsFor(ref, baseResults)].map((t) => t.id)
    expect(repeat).toEqual(first)

    // Same scores, but mex now picks up 2 yellow cards in M28.
    // Fair play, which is checked before the FIFA ranking, now favors kor.
    // So kor rather than mex should be rank 1.
    // If the cache key omitted card counts, this call would incorrectly return the stale { mex } result cached above.
    const cardedResults: ResultsMap = {
      ...baseResults,
      M28: makeResult('M28', 1, 1, { homeYellow: 2 }),
    }
    const second = [...possibleTeamsFor(ref, cardedResults)].map((t) => t.id)
    expect(second).toEqual(['kor'])
  })
})

describe('possibleTeamsFor — deep matchWinner chain', () => {
  it('returns R16 possible teams once all group results but no knockout results exist', () => {
    const results = allGroupResults(1, 0)
    // M89: winner(M74) vs winner(M77)
    // M74 and M77 are R32 matches, both unplayed here.
    const r16match = knockoutMatches.find((m) => m.stage === 'r16')!
    const ref = r16match.homeRef
    const teams = possibleTeamsFor(ref, results)
    // Some teams should be possible, at least the two R32 participants.
    expect(teams.length).toBeGreaterThanOrEqual(2)
  })
})
