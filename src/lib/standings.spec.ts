/**
 * Unit tests for computeGroupStandings — the core aggregation that builds
 * per-team played/wins/draws/losses/GF/GA/GD/points/cards/form stats and
 * sorts them by the full FIFA tiebreaker chain.
 *
 * Uses real Group A teams and match IDs from the fixture data so we test the
 * actual production function, not a re-implemented copy.
 */

import { describe, it, expect } from 'vitest'
import type { Result } from '../types/tournament'
import { computeGroupStandings } from './standings'
import { groupMatches } from '../data/fixtures-2026'

// ---------------------------------------------------------------------------
// Group A fixtures (real IDs from fixtures-2026.ts, chronological order)
// mex (rank 14), rsa (rank 60), kor (rank 25), cze (rank 40)
// idx 0 M01: mex vs rsa
// idx 1 M02: kor vs cze
// idx 2 M25: cze vs rsa
// idx 3 M28: mex vs kor
// idx 4 M53: cze vs mex  ← mex is AWAY here
// idx 5 M54: rsa vs kor
// ---------------------------------------------------------------------------

const groupAMatches = groupMatches.filter((m) => m.group === 'A')

function matchId(i: number): string {
  return groupAMatches[i]!.id
}

function makeResult(
  matchIdx: number,
  homeGoals: number,
  awayGoals: number,
  opts: { homeYellow?: number; homeRed?: number; awayYellow?: number; awayRed?: number } = {},
): Result {
  return {
    matchId: matchId(matchIdx),
    homeGoals,
    awayGoals,
    homeYellow: opts.homeYellow ?? 0,
    homeRed: opts.homeRed ?? 0,
    awayYellow: opts.awayYellow ?? 0,
    awayRed: opts.awayRed ?? 0,
  }
}

function resultsMap(...results: Result[]): Record<string, Result> {
  return Object.fromEntries(results.map((r) => [r.matchId, r]))
}

// ---------------------------------------------------------------------------

describe('computeGroupStandings — basic aggregation', () => {
  it('accumulates played, wins, draws, losses, GF, GA, GD, points correctly', () => {
    // M01 mex 2-0 rsa  → mex: W(3pts,+2,2GF)  rsa: L(0pts,-2,0GF)
    // M02 kor 1-1 cze  → kor: D(1pt,0,1GF)    cze: D(1pt,0,1GF)
    const standings = computeGroupStandings('A', resultsMap(makeResult(0, 2, 0), makeResult(1, 1, 1)))

    const mex = standings.find((s) => s.team.id === 'mex')!
    expect(mex.played).toBe(1)
    expect(mex.wins).toBe(1)
    expect(mex.draws).toBe(0)
    expect(mex.losses).toBe(0)
    expect(mex.goalsFor).toBe(2)
    expect(mex.goalsAgainst).toBe(0)
    expect(mex.goalDiff).toBe(2)
    expect(mex.points).toBe(3)

    const rsa = standings.find((s) => s.team.id === 'rsa')!
    expect(rsa.played).toBe(1)
    expect(rsa.wins).toBe(0)
    expect(rsa.losses).toBe(1)
    expect(rsa.goalsFor).toBe(0)
    expect(rsa.goalsAgainst).toBe(2)
    expect(rsa.goalDiff).toBe(-2)
    expect(rsa.points).toBe(0)

    const kor = standings.find((s) => s.team.id === 'kor')!
    expect(kor.draws).toBe(1)
    expect(kor.points).toBe(1)
    expect(kor.goalsFor).toBe(1)
    expect(kor.goalDiff).toBe(0)
  })

  it('accumulates form in chronological order', () => {
    // mex plays M01(home W), M28(home D), M53(away L)
    const standings = computeGroupStandings(
      'A',
      resultsMap(
        makeResult(0, 2, 0), // M01 mex 2-0 rsa → mex W
        makeResult(3, 1, 1), // M28 mex 1-1 kor → mex D (mex home)
        makeResult(4, 1, 0), // M53 cze 1-0 mex → mex L (mex away)
      ),
    )
    const mex = standings.find((s) => s.team.id === 'mex')!
    expect(mex.form).toEqual(['W', 'D', 'L'])
  })

  it('accumulates yellow and red cards and computes fairPlayScore', () => {
    // M01 mex 1-0 rsa; mex gets 2 yellows (home), rsa gets 1 red (away)
    const standings = computeGroupStandings('A', resultsMap(makeResult(0, 1, 0, { homeYellow: 2, awayRed: 1 })))
    const mex = standings.find((s) => s.team.id === 'mex')!
    expect(mex.yellowCards).toBe(2)
    expect(mex.redCards).toBe(0)
    expect(mex.fairPlayScore).toBe(-2) // -1×yellow

    const rsa = standings.find((s) => s.team.id === 'rsa')!
    expect(rsa.yellowCards).toBe(0)
    expect(rsa.redCards).toBe(1)
    expect(rsa.fairPlayScore).toBe(-3) // -3×red
  })

  it('returns teams with zero stats when no results exist', () => {
    const standings = computeGroupStandings('A', {})
    expect(standings).toHaveLength(4)
    for (const s of standings) {
      expect(s.played).toBe(0)
      expect(s.points).toBe(0)
      expect(s.form).toEqual([])
    }
  })
})

describe('computeGroupStandings — correct ordering', () => {
  it('orders teams by points descending', () => {
    // mex wins all → 9pts; kor/cze each 4pts (D+L+W); rsa loses all → 0pts
    // M01(0): mex 1-0 rsa   M02(1): kor 1-1 cze   M25(2): cze 1-0 rsa
    // M28(3): mex 1-0 kor   M53(4): cze 0-1 mex   M54(5): rsa 0-1 kor
    const standings = computeGroupStandings(
      'A',
      resultsMap(
        makeResult(0, 1, 0), // M01  mex 1-0 rsa  → mex W, rsa L
        makeResult(1, 1, 1), // M02  kor 1-1 cze  → both D
        makeResult(2, 1, 0), // M25  cze 1-0 rsa  → cze W, rsa L
        makeResult(3, 1, 0), // M28  mex 1-0 kor  → mex W, kor L
        makeResult(4, 0, 1), // M53  cze 0-1 mex  → mex W(away), cze L
        makeResult(5, 0, 1), // M54  rsa 0-1 kor  → kor W, rsa L
      ),
    )
    // mex: 9pts | kor: 4pts (D+L+W) GD=0 GF=2 | cze: 4pts (D+W+L) GD=0 GF=2 | rsa: 0pts
    // kor/cze H2H: M02 draw (1-1) → equal. Overall stats equal → FIFA ranking: kor(25) > cze(40)
    expect(standings[0]!.team.id).toBe('mex')
    expect(standings[3]!.team.id).toBe('rsa')
    expect(standings[1]!.team.id).toBe('kor')
    expect(standings[2]!.team.id).toBe('cze')
  })

  it('uses FIFA ranking as final decider when all stats are equal', () => {
    // All 6 matches draw 0-0 → all teams on 3pts, 0GD, 0GF → FIFA ranking decides
    // mex(14) < kor(25) < cze(40) < rsa(60) → mex ranks highest
    const standings = computeGroupStandings(
      'A',
      resultsMap(
        makeResult(0, 0, 0), // M01
        makeResult(1, 0, 0), // M02
        makeResult(2, 0, 0), // M25
        makeResult(3, 0, 0), // M28
        makeResult(4, 0, 0), // M53
        makeResult(5, 0, 0), // M54
      ),
    )
    expect(standings[0]!.team.id).toBe('mex') // rank 14
    expect(standings[1]!.team.id).toBe('kor') // rank 25
    expect(standings[2]!.team.id).toBe('cze') // rank 40
    expect(standings[3]!.team.id).toBe('rsa') // rank 60
  })
})
