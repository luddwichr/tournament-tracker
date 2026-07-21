/**
 * Unit tests for computeGroupStandings.
 * That is the core aggregation building per-team played, W/D/L, GF, GA, GD, points, cards and form stats.
 * It then sorts them by the full FIFA tiebreaker chain.
 *
 * These tests use real Group A teams and match IDs from the fixture data.
 * That way they exercise the actual production function rather than a re-implemented copy.
 */

import { allGroupResults, makeResult, resultsMap } from '../test-support/results'
import { beforeEach, describe, expect, it } from 'vitest'
import { clearStandingsCache, computeGroupStandings, isGroupStageComplete, resultFingerprint } from './standings'
import { groupMatches } from '../data/fixtures-2026'
import { resultsWithout } from './invalidation'

// Group A fixtures, using real IDs from fixtures-2026.ts in chronological order.
// mex (rank 14), rsa (rank 60), kor (rank 25), cze (rank 40)
// idx 0 M01: mex vs rsa
// idx 1 M02: kor vs cze
// idx 2 M25: cze vs rsa
// idx 3 M28: mex vs kor
// idx 4 M53: cze vs mex  ← mex is AWAY here
// idx 5 M54: rsa vs kor

const groupAMatches = groupMatches.filter((m) => m.group === 'A')

function mid(i: number): string {
  return groupAMatches[i]!.id
}

describe('computeGroupStandings — basic aggregation', () => {
  it('accumulates played, wins, draws, losses, GF, GA, GD, points correctly', () => {
    // M01 mex 2-0 rsa  → mex: W(3pts,+2,2GF)  rsa: L(0pts,-2,0GF)
    // M02 kor 1-1 cze  → kor: D(1pt,0,1GF)    cze: D(1pt,0,1GF)
    const standings = computeGroupStandings('A', resultsMap(makeResult(mid(0), 2, 0), makeResult(mid(1), 1, 1)))

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
        makeResult(mid(0), 2, 0), // M01 mex 2-0 rsa → mex W
        makeResult(mid(3), 1, 1), // M28 mex 1-1 kor → mex D (mex home)
        makeResult(mid(4), 1, 0), // M53 cze 1-0 mex → mex L (mex away)
      ),
    )
    const mex = standings.find((s) => s.team.id === 'mex')!
    expect(mex.form).toEqual(['W', 'D', 'L'])
  })

  it('accumulates yellow and red cards and computes fairPlayScore', () => {
    // M01 mex 1-0 rsa; mex gets 2 yellows (home), rsa gets 1 red (away)
    const standings = computeGroupStandings('A', resultsMap(makeResult(mid(0), 1, 0, { awayRed: 1, homeYellow: 2 })))
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

describe('computeGroupStandings — partial group (unplayed matches)', () => {
  it('handles partial results: only 2 of 6 matches played', () => {
    // M01 mex 2-1 rsa and M02 kor 1-0 cze, with the remaining 4 matches unplayed.
    const standings = computeGroupStandings(
      'A',
      resultsMap(
        makeResult(mid(0), 2, 1), // M01  mex 2-1 rsa
        makeResult(mid(1), 1, 0), // M02  kor 1-0 cze
      ),
    )
    expect(standings).toHaveLength(4)
    const mex = standings.find((s) => s.team.id === 'mex')!
    expect(mex.played).toBe(1)
    expect(mex.points).toBe(3)
    const cze = standings.find((s) => s.team.id === 'cze')!
    expect(cze.played).toBe(1)
    expect(cze.points).toBe(0)
  })

  it('uses overall goals scored (Step 2 e) when points and GD are equal — partial group', () => {
    // M01 mex 2-1 rsa: mex 3pts +1GD 2GF, rsa 0pts -1GD 1GF
    // M02 kor 1-0 cze: kor 3pts +1GD 1GF, cze 0pts -1GD 0GF
    // mex and kor never met, so there is no head-to-head and Step 1 makes no progress.
    // Step 2 d (overall GD) ties at +1, then e (overall goals) gives mex 2GF > kor 1GF → mex first.
    // rsa and cze work the same way: overall GD ties at -1, then rsa 1GF > cze 0GF → rsa before cze.
    const standings = computeGroupStandings(
      'A',
      resultsMap(
        makeResult(mid(0), 2, 1), // M01 mex(h) 2-1 rsa(a)
        makeResult(mid(1), 1, 0), // M02 kor(h) 1-0 cze(a)
      ),
    )
    expect(standings[0]!.team.id).toBe('mex') // 3pts +1GD 2GF
    expect(standings[1]!.team.id).toBe('kor') // 3pts +1GD 1GF, loses by criterion 3
    expect(standings[2]!.team.id).toBe('rsa') // 0pts -1GD 1GF, wins criterion 3 vs cze
    expect(standings[3]!.team.id).toBe('cze') // 0pts -1GD 0GF
  })
})

describe('computeGroupStandings — correct ordering', () => {
  it('orders teams by points descending', () => {
    // mex wins all → 9pts, kor and cze each take 4pts (D+L+W), rsa loses all → 0pts.
    // M01(0): mex 1-0 rsa   M02(1): kor 1-1 cze   M25(2): cze 1-0 rsa
    // M28(3): mex 1-0 kor   M53(4): cze 0-1 mex   M54(5): rsa 0-1 kor
    const standings = computeGroupStandings(
      'A',
      resultsMap(
        makeResult(mid(0), 1, 0), // M01  mex 1-0 rsa  → mex W, rsa L
        makeResult(mid(1), 1, 1), // M02  kor 1-1 cze  → both D
        makeResult(mid(2), 1, 0), // M25  cze 1-0 rsa  → cze W, rsa L
        makeResult(mid(3), 1, 0), // M28  mex 1-0 kor  → mex W, kor L
        makeResult(mid(4), 0, 1), // M53  cze 0-1 mex  → mex W(away), cze L
        makeResult(mid(5), 0, 1), // M54  rsa 0-1 kor  → kor W, rsa L
      ),
    )
    // mex: 9pts | kor: 4pts (D+L+W) GD=0 GF=2 | cze: 4pts (D+W+L) GD=0 GF=2 | rsa: 0pts
    // The kor/cze head-to-head M02 is a 1-1 draw, so they are equal there.
    // Overall stats are equal too, so the FIFA ranking decides: kor(25) > cze(40).
    expect(standings[0]!.team.id).toBe('mex')
    expect(standings[3]!.team.id).toBe('rsa')
    expect(standings[1]!.team.id).toBe('kor')
    expect(standings[2]!.team.id).toBe('cze')
  })

  it('uses FIFA ranking as final decider when all stats are equal', () => {
    // All 6 matches draw 0-0, so all teams sit on 3pts, 0GD and 0GF and the FIFA ranking decides.
    // mex(14) < kor(25) < cze(40) < rsa(60), so mex ranks highest.
    const standings = computeGroupStandings(
      'A',
      resultsMap(
        makeResult(mid(0), 0, 0), // M01
        makeResult(mid(1), 0, 0), // M02
        makeResult(mid(2), 0, 0), // M25
        makeResult(mid(3), 0, 0), // M28
        makeResult(mid(4), 0, 0), // M53
        makeResult(mid(5), 0, 0), // M54
      ),
    )
    expect(standings[0]!.team.id).toBe('mex') // rank 14
    expect(standings[1]!.team.id).toBe('kor') // rank 25
    expect(standings[2]!.team.id).toBe('cze') // rank 40
    expect(standings[3]!.team.id).toBe('rsa') // rank 60
  })

  it('red card is weighted ×3 vs ×1 for yellow — 1 red beats 2 yellows in fair-play', () => {
    // All matches are 1-1 draws, so every team has the same points, GD and GF.
    // The head-to-head matches are all 1-1 draws too, so head-to-head makes no progress.
    // mex gets 1 red card in M01 at home, so fairPlay = -3.
    // cze gets 2 yellow cards in M25 at home, so fairPlay = -2.
    // kor and rsa pick up no cards, so fairPlay = 0.
    //
    // Fair-play therefore decides: kor=rsa=0 > cze=-2 > mex=-3.
    // kor and rsa have the same fair-play score, so the FIFA rank decides: kor(25) > rsa(60) → kor first.
    // The expected order is kor, rsa, cze, mex.
    const standings = computeGroupStandings(
      'A',
      resultsMap(
        makeResult(mid(0), 1, 1, { homeRed: 1 }), // M01 mex(h) 1-1 rsa, mex gets 1 red
        makeResult(mid(1), 1, 1), //                  M02 kor(h) 1-1 cze
        makeResult(mid(2), 1, 1, { homeYellow: 2 }), // M25 cze(h) 1-1 rsa, cze gets 2 yellows
        makeResult(mid(3), 1, 1), //                  M28 mex(h) 1-1 kor
        makeResult(mid(4), 1, 1), //                  M53 cze(h) 1-1 mex
        makeResult(mid(5), 1, 1), //                  M54 rsa(h) 1-1 kor
      ),
    )
    expect(standings[0]!.team.id).toBe('kor') // 0 cards
    expect(standings[1]!.team.id).toBe('rsa') // 0 cards, worse FIFA rank than kor
    expect(standings[2]!.team.id).toBe('cze') // -2 fair-play (2 yellows)
    expect(standings[3]!.team.id).toBe('mex') // -3 fair-play (1 red × 3)
  })
})

// resultFingerprint is the cache-key builder shared with possible-teams.ts.

describe('resultFingerprint', () => {
  it('is identical for two equal results maps', () => {
    const a = resultsMap(makeResult(mid(0), 2, 0), makeResult(mid(1), 1, 1))
    const b = resultsMap(makeResult(mid(0), 2, 0), makeResult(mid(1), 1, 1))
    expect(resultFingerprint('A', a)).toBe(resultFingerprint('A', b))
  })

  it('changes when a score changes', () => {
    const a = resultsMap(makeResult(mid(0), 2, 0))
    const b = resultsMap(makeResult(mid(0), 1, 0))
    expect(resultFingerprint('A', a)).not.toBe(resultFingerprint('A', b))
  })

  it('changes when only discipline counts differ (same score)', () => {
    const a = resultsMap(makeResult(mid(0), 1, 0, { homeYellow: 1 }))
    const b = resultsMap(makeResult(mid(0), 1, 0, { homeYellow: 2 }))
    expect(resultFingerprint('A', a)).not.toBe(resultFingerprint('A', b))
  })
})

describe('computeGroupStandings — memoization', () => {
  beforeEach(() => {
    clearStandingsCache()
  })

  it('returns the same array reference for two calls with an equal (but distinct) results object', () => {
    const results1 = resultsMap(makeResult(mid(0), 2, 0), makeResult(mid(1), 1, 1))
    const results2 = resultsMap(makeResult(mid(0), 2, 0), makeResult(mid(1), 1, 1))
    const first = computeGroupStandings('A', results1)
    const second = computeGroupStandings('A', results2)
    expect(second).toBe(first)
  })

  it('recomputes (different reference) once a score changes', () => {
    const first = computeGroupStandings('A', resultsMap(makeResult(mid(0), 2, 0)))
    const second = computeGroupStandings('A', resultsMap(makeResult(mid(0), 1, 0)))
    expect(second).not.toBe(first)
  })

  it('clearStandingsCache forces recomputation for the same results', () => {
    const results = resultsMap(makeResult(mid(0), 2, 0))
    const first = computeGroupStandings('A', results)
    clearStandingsCache()
    const second = computeGroupStandings('A', results)
    expect(second).not.toBe(first)
    // Content is still equivalent, and only the cache identity changed.
    expect(second.map((s) => s.team.id)).toEqual(first.map((s) => s.team.id))
  })
})

describe('isGroupStageComplete', () => {
  it('is false for an empty results map', () => {
    expect(isGroupStageComplete({})).toBe(false)
  })

  it('is false while a single group match is still missing a result', () => {
    const results = resultsWithout(allGroupResults(), [groupMatches[0]!.id])
    expect(isGroupStageComplete(results)).toBe(false)
  })

  it('is true once every group match has a result', () => {
    expect(isGroupStageComplete(allGroupResults())).toBe(true)
  })
})
