/**
 * Isolated tests for the sortTeams tiebreaker chain.
 *
 * Tests here call sortTeams directly with crafted overallStats so each
 * criterion can be exercised in isolation without having to construct a
 * full 6-match group scenario for every edge case.
 *
 * Group A (real teams and match slots from fixtures-2026.ts):
 * mex (FIFA rank 14), kor (25), cze (40), rsa (60)
 * H2H matches among mex/kor/cze:
 * M28: mex(h) vs kor(a)
 * M02: kor(h) vs cze(a)
 * M53: cze(h) vs mex(a)
 */

import { compareByPointsGdGf, sortTeams } from './tiebreakers'
import { describe, expect, it } from 'vitest'
import type { ResultsMap } from '../types/tournament'
import type { TiebreakerStat } from './tiebreakers'
import { groupMatches } from '../data/fixtures-2026'
import { makeResult } from '../test-support/results'
import { teamsInGroup } from '../data/teams'

const groupATeams = teamsInGroup('A') // mex(14), rsa(60), kor(25), cze(40)
const groupAMatches = groupMatches.filter((m) => m.group === 'A')

/** Build an overallStats map that ties mex/kor/cze (same pts/GD/GF) and puts rsa last. */
function tiedStats(): Map<string, TiebreakerStat> {
  return new Map([
    ['mex', { fairPlayScore: 0, goalDiff: 0, goalsFor: 1, points: 3 }],
    ['kor', { fairPlayScore: 0, goalDiff: 0, goalsFor: 1, points: 3 }],
    ['cze', { fairPlayScore: 0, goalDiff: 0, goalsFor: 1, points: 3 }],
    ['rsa', { fairPlayScore: 0, goalDiff: -3, goalsFor: 0, points: 0 }],
  ])
}

describe('sortTeams — Step 1 head-to-head outranks overall goal difference', () => {
  it('ranks the head-to-head winner above a team with a better overall GD', () => {
    // mex and kor are level on points. kor has the better OVERALL goal
    // difference, but mex beat kor head-to-head (M28). Under the 2026 rules
    // (Article 13), Step 1 head-to-head decides before Step 2's overall GD, so
    // mex must rank above kor.
    const stats: Map<string, TiebreakerStat> = new Map([
      ['mex', { fairPlayScore: 0, goalDiff: 1, goalsFor: 3, points: 6 }], // worse overall GD
      ['kor', { fairPlayScore: 0, goalDiff: 5, goalsFor: 9, points: 6 }], // better overall GD
      ['cze', { fairPlayScore: 0, goalDiff: -3, goalsFor: 0, points: 0 }],
      ['rsa', { fairPlayScore: 0, goalDiff: -3, goalsFor: 0, points: 0 }],
    ])
    const results: ResultsMap = {
      M28: makeResult('M28', 1, 0), // mex(h) 1-0 kor(a), mex wins the head-to-head
    }

    const sorted = sortTeams(groupATeams, groupAMatches, results, stats)
    const ids = sorted.map((t) => t.id)

    expect(ids.indexOf('mex')).toBeLessThan(ids.indexOf('kor'))
  })
})

describe('sortTeams — Step 2 overall GD decides when head-to-head is level', () => {
  it('falls through to overall goal difference when the tied teams drew head-to-head', () => {
    // Same two teams level on points, but the head-to-head match was a draw, so
    // Step 1 makes no progress. Step 2 (d) then ranks by overall GD: kor's +5
    // beats mex's +1.
    const stats: Map<string, TiebreakerStat> = new Map([
      ['mex', { fairPlayScore: 0, goalDiff: 1, goalsFor: 3, points: 6 }],
      ['kor', { fairPlayScore: 0, goalDiff: 5, goalsFor: 9, points: 6 }], // better overall GD
      ['cze', { fairPlayScore: 0, goalDiff: -3, goalsFor: 0, points: 0 }],
      ['rsa', { fairPlayScore: 0, goalDiff: -3, goalsFor: 0, points: 0 }],
    ])
    const results: ResultsMap = {
      M28: makeResult('M28', 1, 1), // mex(h) 1-1 kor(a), head-to-head level
    }

    const sorted = sortTeams(groupATeams, groupAMatches, results, stats)
    const ids = sorted.map((t) => t.id)

    expect(ids.indexOf('kor')).toBeLessThan(ids.indexOf('mex'))
  })
})

describe('sortTeams — H2H goal difference as tiebreaker', () => {
  it('uses H2H GD when H2H pts are tied among three teams', () => {
    // H2H cycle (all wins by margin, so H2H pts each = 3):
    //   M28 mex(h) 3-0 kor(a) → mex H2H GD +3, kor -3
    //   M02 kor(h) 1-0 cze(a) → kor H2H GD +1, cze -1
    //   M53 cze(h) 1-0 mex(a) → cze H2H GD +1, mex -1
    //
    // H2H pts: mex=3, kor=3, cze=3 (tied)
    // H2H GD: mex=+3−1=+2, kor=−3+1=−2, cze=−1+1=0 → mex > cze > kor
    const results: ResultsMap = {
      M02: makeResult('M02', 1, 0), // kor(h) 1-0 cze(a)
      M28: makeResult('M28', 3, 0), // mex(h) 3-0 kor(a)
      M53: makeResult('M53', 1, 0), // cze(h) 1-0 mex(a)
    }

    const sorted = sortTeams(groupATeams, groupAMatches, results, tiedStats())
    const ids = sorted.map((t) => t.id)

    expect(ids.indexOf('mex')).toBeLessThan(ids.indexOf('cze'))
    expect(ids.indexOf('cze')).toBeLessThan(ids.indexOf('kor'))
    expect(ids[3]).toBe('rsa') // rsa is in the 0-pts cluster, always last
  })
})

describe('sortTeams — H2H goals scored as tiebreaker', () => {
  it('uses H2H GF when H2H pts AND H2H GD are tied among three teams', () => {
    // Symmetric H2H cycle (each win by exactly 1 goal, so H2H GD cancels):
    //   M28 mex(h) 3-2 kor(a) → mex GD+1, mex GF=3; kor GD-1, kor GF=2
    //   M02 kor(h) 2-1 cze(a) → kor GD+1, kor GF=2; cze GD-1, cze GF=1
    //   M53 cze(h) 1-0 mex(a) → cze GD+1, cze GF=1; mex GD-1, mex GF=0
    //
    // H2H pts: mex=3, kor=3, cze=3 (tied)
    // H2H GD: mex=+1−1=0, kor=−1+1=0, cze=−1+1=0 (tied)
    // H2H GF: mex=3+0=3, kor=2+2=4, cze=1+1=2 → kor > mex > cze
    const results: ResultsMap = {
      M02: makeResult('M02', 2, 1), // kor(h) 2-1 cze(a)
      M28: makeResult('M28', 3, 2), // mex(h) 3-2 kor(a)
      M53: makeResult('M53', 1, 0), // cze(h) 1-0 mex(a)
    }

    const sorted = sortTeams(groupATeams, groupAMatches, results, tiedStats())
    const ids = sorted.map((t) => t.id)

    expect(ids.indexOf('kor')).toBeLessThan(ids.indexOf('mex'))
    expect(ids.indexOf('mex')).toBeLessThan(ids.indexOf('cze'))
    expect(ids[3]).toBe('rsa')
  })
})

describe('sortTeams — H2H recursion when tie is partially narrowed', () => {
  it('recurses on remaining tied sub-cluster after H2H splits one team off', () => {
    // All 4 teams tied on overall stats.
    // H2H: mex beats kor by large margin (M28 mex 3-0 kor), all other matches 0-0 draws.
    // First H2H pass clusters: {mex} separate (best H2H pts), {cze, rsa} still tied (1pt each, 0GD),
    // {kor} separate (0pts from H2H loss to mex, 1pt from ties = tied with cze/rsa?).
    //
    // Actually: kor loses M28 but draws M02 and M54 → kor H2H pts = 0+1+1 = 2.
    // mex wins M28 but draws M01 and M53 → mex H2H pts = 3+1+1 = 5.
    // cze draws M02, M25, M53 → cze H2H pts = 1+1+1 = 3.
    // rsa draws M01, M25, M54 → rsa H2H pts = 1+1+1 = 3.
    //
    // clusterByStats on H2H: mex(5pts) | cze=rsa(3pts) | kor(2pts).
    // cze/rsa sub-cluster (length 2 < teams.length 4) → recurse on {cze, rsa}.
    // H2H between {cze, rsa}: M25 cze(h) 0-0 rsa(a) → 1pt each, 0GD, 0GF → no progress.
    // Falls through Step 2 d–f (overall GD/GF/fair-play all equal) then FIFA
    // rank (g): cze(40) < rsa(60) → cze before rsa.
    //
    // Final order: mex, cze, rsa, kor.
    const allTied: Map<string, TiebreakerStat> = new Map([
      ['mex', { fairPlayScore: 0, goalDiff: 0, goalsFor: 1, points: 3 }],
      ['kor', { fairPlayScore: 0, goalDiff: 0, goalsFor: 1, points: 3 }],
      ['cze', { fairPlayScore: 0, goalDiff: 0, goalsFor: 1, points: 3 }],
      ['rsa', { fairPlayScore: 0, goalDiff: 0, goalsFor: 1, points: 3 }],
    ])
    const results: ResultsMap = {
      M01: makeResult('M01', 0, 0), // mex(h) 0-0 rsa(a)
      M02: makeResult('M02', 0, 0), // kor(h) 0-0 cze(a)
      M25: makeResult('M25', 0, 0), // cze(h) 0-0 rsa(a)
      M28: makeResult('M28', 3, 0), // mex(h) 3-0 kor(a), the one decisive H2H match
      M53: makeResult('M53', 0, 0), // cze(h) 0-0 mex(a)
      M54: makeResult('M54', 0, 0), // rsa(h) 0-0 kor(a)
    }

    const sorted = sortTeams(groupATeams, groupAMatches, results, allTied)
    const ids = sorted.map((t) => t.id)

    expect(ids[0]).toBe('mex') // best H2H pts
    expect(ids[1]).toBe('cze') // tied with rsa; beaten by FIFA rank (40 < 60)
    expect(ids[2]).toBe('rsa')
    expect(ids[3]).toBe('kor') // worst H2H pts
  })
})

// A team without an overallStats entry must fail loudly.
// Otherwise the internal `.get(id)!` assertions silently produce a NaN-driven mis-ordering.

describe('sortTeams — missing overallStats entry', () => {
  it('throws a descriptive error instead of silently mis-sorting when a team has no stats', () => {
    // rsa is omitted from overallStats entirely.
    const incompleteStats: Map<string, TiebreakerStat> = new Map([
      ['mex', { fairPlayScore: 0, goalDiff: 0, goalsFor: 1, points: 3 }],
      ['kor', { fairPlayScore: 0, goalDiff: 0, goalsFor: 1, points: 3 }],
      ['cze', { fairPlayScore: 0, goalDiff: 0, goalsFor: 1, points: 3 }],
    ])

    expect(() => sortTeams(groupATeams, groupAMatches, {}, incompleteStats)).toThrow(/rsa/)
  })
})

describe('sortTeams — Step 2 re-applies head-to-head to the narrowed tie', () => {
  it('ranks the remaining two teams by their own match, not by overall GD', () => {
    // A three-way cycle in which every team wins once:
    //   M28 mex(h) 2-1 kor(a)
    //   M02 kor(h) 3-1 cze(a)
    //   M53 cze(h) 3-0 mex(a)
    //
    // Three-way H2H: all 3 pts, GD mex −2, kor +1, cze +1, GF mex 2, kor 4, cze 4.
    // mex drops out, and kor and cze remain level on a–c.
    // Re-applying a–c to kor vs cze alone separates them, because kor won M02.
    // cze has the better overall GD, so skipping the re-application would wrongly put cze first.
    const stats: Map<string, TiebreakerStat> = new Map([
      ['mex', { fairPlayScore: 0, goalDiff: 0, goalsFor: 5, points: 6 }],
      ['kor', { fairPlayScore: 0, goalDiff: 1, goalsFor: 5, points: 6 }],
      ['cze', { fairPlayScore: 0, goalDiff: 4, goalsFor: 5, points: 6 }],
      ['rsa', { fairPlayScore: 0, goalDiff: -5, goalsFor: 0, points: 0 }],
    ])
    const results: ResultsMap = {
      M02: makeResult('M02', 3, 1),
      M28: makeResult('M28', 2, 1),
      M53: makeResult('M53', 3, 0),
    }

    const ids = sortTeams(groupATeams, groupAMatches, results, stats).map((t) => t.id)

    expect(ids).toEqual(['kor', 'cze', 'mex', 'rsa'])
  })
})

describe('sortTeams — Step 2 applies d, e and f in order', () => {
  // mex and kor are level on points and drew head-to-head, so only the overall criteria can split them.
  const drawnH2H: ResultsMap = { M28: makeResult('M28', 1, 1) }

  function rank(mex: TiebreakerStat, kor: TiebreakerStat): string[] {
    const stats: Map<string, TiebreakerStat> = new Map([
      ['mex', mex],
      ['kor', kor],
      ['cze', { fairPlayScore: 0, goalDiff: -5, goalsFor: 0, points: 0 }],
      ['rsa', { fairPlayScore: 0, goalDiff: -5, goalsFor: 0, points: 0 }],
    ])
    return sortTeams(groupATeams, groupAMatches, drawnH2H, stats)
      .map((t) => t.id)
      .filter((id) => id === 'mex' || id === 'kor')
  }

  it('lets overall GD (d) win over more goals scored (e)', () => {
    const ranking = rank(
      { fairPlayScore: 0, goalDiff: 1, goalsFor: 9, points: 4 },
      { fairPlayScore: 0, goalDiff: 2, goalsFor: 3, points: 4 },
    )
    expect(ranking).toEqual(['kor', 'mex'])
  })

  it('lets overall goals scored (e) win over a better fair-play score (f)', () => {
    const ranking = rank(
      { fairPlayScore: -4, goalDiff: 1, goalsFor: 5, points: 4 },
      { fairPlayScore: 0, goalDiff: 1, goalsFor: 3, points: 4 },
    )
    expect(ranking).toEqual(['mex', 'kor'])
  })

  it('applies goals scored (e) the same way when the second team scored more', () => {
    const ranking = rank(
      { fairPlayScore: 0, goalDiff: 1, goalsFor: 3, points: 4 },
      { fairPlayScore: -4, goalDiff: 1, goalsFor: 5, points: 4 },
    )
    expect(ranking).toEqual(['kor', 'mex'])
  })
})

describe('compareByPointsGdGf', () => {
  it('ranks the larger of two positive goal differences first, whatever the goals scored', () => {
    const better = { goalDiff: 3, goalsFor: 4, points: 4 }
    const worse = { goalDiff: 1, goalsFor: 9, points: 4 }

    expect(compareByPointsGdGf(better, worse)).toBeLessThan(0)
    expect(compareByPointsGdGf(worse, better)).toBeGreaterThan(0)
  })
})
