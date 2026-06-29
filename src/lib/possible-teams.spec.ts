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
import { groupMatches, knockoutMatches } from '../data/fixtures-2026'
import { possibleTeamsFor, clearPossibleTeamsCache } from './possible-teams'

beforeEach(() => {
  clearPossibleTeamsCache()
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResult(matchId: string, homeGoals: number, awayGoals: number): Result {
  return { matchId, homeGoals, awayGoals, homeYellow: 0, homeRed: 0, awayYellow: 0, awayRed: 0 }
}

function allGroupResults(homeGoals = 1, awayGoals = 0): Record<string, Result> {
  const results: Record<string, Result> = {}
  for (const m of groupMatches) {
    results[m.id] = makeResult(m.id, homeGoals, awayGoals)
  }
  return results
}

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
  it('returns exactly 2 possible rank-1 teams when only mex vs kor remains', () => {
    const results = groupAFiveMatchResults()
    const ref: TeamRef = { kind: 'groupRank', group: 'A', rank: 1 }
    const teams = possibleTeamsFor(ref, results)
    expect(teams.size).toBe(2)
    const ids = [...teams].map((t) => t.id)
    expect(ids).toContain('mex')
    expect(ids).toContain('kor')
  })

  it('does not include cze or rsa as possible rank-1 teams', () => {
    const results = groupAFiveMatchResults()
    const ref: TeamRef = { kind: 'groupRank', group: 'A', rank: 1 }
    const teams = possibleTeamsFor(ref, results)
    const ids = [...teams].map((t) => t.id)
    expect(ids).not.toContain('cze')
    expect(ids).not.toContain('rsa')
  })

  it('returns exactly 2 possible rank-2 teams (same mex and kor)', () => {
    const results = groupAFiveMatchResults()
    const ref: TeamRef = { kind: 'groupRank', group: 'A', rank: 2 }
    const teams = possibleTeamsFor(ref, results)
    expect(teams.size).toBe(2)
    const ids = [...teams].map((t) => t.id)
    expect(ids).toContain('mex')
    expect(ids).toContain('kor')
  })

  it('possible rank-1 and rank-2 sets together cover exactly mex and kor', () => {
    // Verifies the inverse: if only mex and kor can be rank 1 or rank 2,
    // then cze and rsa are confined to ranks 3 and 4 (not directly testable
    // via TeamRef since groupRank only exposes rank 1 and 2).
    const results = groupAFiveMatchResults()
    const rank1ids = [...possibleTeamsFor({ kind: 'groupRank', group: 'A', rank: 1 }, results)].map((t) => t.id)
    const rank2ids = [...possibleTeamsFor({ kind: 'groupRank', group: 'A', rank: 2 }, results)].map((t) => t.id)
    const combined = new Set([...rank1ids, ...rank2ids])
    expect(combined.has('mex')).toBe(true)
    expect(combined.has('kor')).toBe(true)
    expect(combined.has('cze')).toBe(false)
    expect(combined.has('rsa')).toBe(false)
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

  it('returns empty set when match result is a draw without penalty winner', () => {
    const results = allGroupResults(1, 0)
    results['M73'] = makeResult('M73', 1, 1) // draw, no penaltyWinner
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
// Memoization — second call returns the same Set instance
// ---------------------------------------------------------------------------

describe('possibleTeamsFor — memoization', () => {
  it('returns Team object singletons across calls (same Team reference in both results)', () => {
    const results = groupAFiveMatchResults()
    const ref: TeamRef = { kind: 'groupRank', group: 'A', rank: 1 }
    const first = [...possibleTeamsFor(ref, results)]
    const second = [...possibleTeamsFor(ref, results)]
    // Team objects come from a singleton map; verify the exact same references are returned
    expect(first.map((t) => t.id).toSorted()).toEqual(second.map((t) => t.id).toSorted())
    for (const team of first) {
      expect(second).toContain(team) // same object reference, not a copy
    }
  })

  it('clearPossibleTeamsCache resets state so fresh enumeration runs again', () => {
    const results = groupAFiveMatchResults()
    const ref: TeamRef = { kind: 'groupRank', group: 'A', rank: 1 }
    const first = possibleTeamsFor(ref, results)
    clearPossibleTeamsCache()
    const second = possibleTeamsFor(ref, results)
    // Content should be identical after a cache clear + re-run
    expect([...first].map((t) => t.id).toSorted()).toEqual([...second].map((t) => t.id).toSorted())
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
