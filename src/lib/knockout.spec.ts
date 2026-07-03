/**
 * Unit tests for knockout bracket resolution (resolveTeamRef / canEnterResult).
 */

import { describe, it, expect } from 'vitest'
import type { Result, TeamRef } from '../types/tournament'
import { groupMatches, knockoutMatches } from '../data/fixtures-2026'
import { teamsById } from '../data/teams'
import { resolveTeamRef, canEnterResult, currentBracketColumn } from './knockout'
import { makeResult, allGroupResults } from '../test-support/results'

// ---------------------------------------------------------------------------
// 'team' kind
// ---------------------------------------------------------------------------

describe("resolveTeamRef — kind 'team'", () => {
  it('returns the team immediately', () => {
    const ref: TeamRef = { kind: 'team', teamId: 'ger' }
    const team = resolveTeamRef(ref, {})
    expect(team).not.toBeNull()
    expect(team!.id).toBe('ger')
  })

  it('returns null for an unknown teamId', () => {
    const ref: TeamRef = { kind: 'team', teamId: 'zzz' }
    expect(resolveTeamRef(ref, {})).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 'groupRank' kind
// ---------------------------------------------------------------------------

describe("resolveTeamRef — kind 'groupRank'", () => {
  it('returns null while the group is incomplete', () => {
    const ref: TeamRef = { kind: 'groupRank', group: 'A', rank: 1 }
    expect(resolveTeamRef(ref, {})).toBeNull()
  })

  it('returns null when only some group A matches have results', () => {
    const ref: TeamRef = { kind: 'groupRank', group: 'A', rank: 1 }
    const partial: Record<string, Result> = {}
    groupMatches
      .filter((m) => m.group === 'A')
      .slice(0, 3) // only 3 of 6 matches
      .forEach((m) => {
        partial[m.id] = makeResult(m.id, 1, 0)
      })
    expect(resolveTeamRef(ref, partial)).toBeNull()
  })

  it('returns a Team once the group is complete', () => {
    const ref: TeamRef = { kind: 'groupRank', group: 'A', rank: 1 }
    const complete: Record<string, Result> = {}
    groupMatches
      .filter((m) => m.group === 'A')
      .forEach((m) => {
        complete[m.id] = makeResult(m.id, 1, 0)
      })
    const team = resolveTeamRef(ref, complete)
    expect(team).not.toBeNull()
    expect(team!.group).toBe('A')
  })

  it('returns rank-2 (runner-up) when group is complete', () => {
    const ref1: TeamRef = { kind: 'groupRank', group: 'A', rank: 1 }
    const ref2: TeamRef = { kind: 'groupRank', group: 'A', rank: 2 }
    const complete: Record<string, Result> = {}
    groupMatches
      .filter((m) => m.group === 'A')
      .forEach((m) => {
        complete[m.id] = makeResult(m.id, 1, 0)
      })
    const winner = resolveTeamRef(ref1, complete)
    const runnerUp = resolveTeamRef(ref2, complete)
    expect(winner).not.toBeNull()
    expect(runnerUp).not.toBeNull()
    expect(winner!.id).not.toBe(runnerUp!.id)
  })
})

// ---------------------------------------------------------------------------
// 'thirdPlace' kind
// ---------------------------------------------------------------------------

describe("resolveTeamRef — kind 'thirdPlace'", () => {
  it('returns null when group stage is incomplete', () => {
    const ref: TeamRef = { kind: 'thirdPlace', slot: 1 }
    expect(resolveTeamRef(ref, {})).toBeNull()
  })

  it('returns a Team from one of the 12 groups once all groups complete', () => {
    const results = allGroupResults(1, 0)
    const ref: TeamRef = { kind: 'thirdPlace', slot: 1 }
    const team = resolveTeamRef(ref, results)
    expect(team).not.toBeNull()
    expect(teamsById.has(team!.id)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// 'matchWinner' / 'matchLoser' kind
// ---------------------------------------------------------------------------

describe("resolveTeamRef — kind 'matchWinner'", () => {
  it('returns null for an unknown matchId', () => {
    const ref: TeamRef = { kind: 'matchWinner', matchId: 'UNKNOWN_999' }
    // fixtures.find returns undefined → the branch returns null
    expect(resolveTeamRef(ref, { UNKNOWN_999: makeResult('UNKNOWN_999', 1, 0) })).toBeNull()
  })

  it('returns null when the referenced match has no result yet', () => {
    // M73 is A2 vs B2 in R32; group A and B must be complete to know A2/B2.
    const ref: TeamRef = { kind: 'matchWinner', matchId: 'M73' }
    expect(resolveTeamRef(ref, {})).toBeNull()
  })

  it('returns null when the upstream group is incomplete', () => {
    const ref: TeamRef = { kind: 'matchWinner', matchId: 'M73' }
    // Even though M73 itself would have a result, upstream refs (A2, B2) are unresolved.
    const results: Record<string, Result> = {}
    results['M73'] = makeResult('M73', 1, 0)
    expect(resolveTeamRef(ref, results)).toBeNull()
  })

  it('returns the winner of M73 (A2 vs B2) once groups A and B are complete', () => {
    const results: Record<string, Result> = {}
    // Complete groups A and B.
    groupMatches
      .filter((m) => m.group === 'A' || m.group === 'B')
      .forEach((m) => {
        results[m.id] = makeResult(m.id, 1, 0)
      })
    // M73: home=A2 beats away=B2
    results['M73'] = makeResult('M73', 2, 1)
    const ref: TeamRef = { kind: 'matchWinner', matchId: 'M73' }
    const winner = resolveTeamRef(ref, results)
    expect(winner).not.toBeNull()
    // A2 is the home team in M73.
    const homeRef = knockoutMatches.find((m) => m.id === 'M73')!.homeRef
    expect(homeRef.kind).toBe('groupRank')
    const a2 = resolveTeamRef(homeRef, results)
    expect(winner!.id).toBe(a2!.id)
  })

  it('returns null for a draw', () => {
    const results: Record<string, Result> = {}
    groupMatches
      .filter((m) => m.group === 'A' || m.group === 'B')
      .forEach((m) => {
        results[m.id] = makeResult(m.id, 1, 0)
      })
    results['M73'] = makeResult('M73', 1, 1)
    const ref: TeamRef = { kind: 'matchWinner', matchId: 'M73' }
    expect(resolveTeamRef(ref, results)).toBeNull()
  })
})

describe("resolveTeamRef — kind 'matchLoser'", () => {
  it('returns the loser of M73 (A2 vs B2)', () => {
    const results: Record<string, Result> = {}
    groupMatches
      .filter((m) => m.group === 'A' || m.group === 'B')
      .forEach((m) => {
        results[m.id] = makeResult(m.id, 1, 0)
      })
    results['M73'] = makeResult('M73', 2, 1) // home (A2) wins
    const winnerRef: TeamRef = { kind: 'matchWinner', matchId: 'M73' }
    const loserRef: TeamRef = { kind: 'matchLoser', matchId: 'M73' }
    const winner = resolveTeamRef(winnerRef, results)
    const loser = resolveTeamRef(loserRef, results)
    expect(winner).not.toBeNull()
    expect(loser).not.toBeNull()
    expect(winner!.id).not.toBe(loser!.id)
    // Away team (B2) is the loser.
    const awayRef = knockoutMatches.find((m) => m.id === 'M73')!.awayRef
    const b2 = resolveTeamRef(awayRef, results)
    expect(loser!.id).toBe(b2!.id)
  })
})

// ---------------------------------------------------------------------------
// canEnterResult
// ---------------------------------------------------------------------------

describe('canEnterResult', () => {
  it('returns true for a group-stage match even with no results', () => {
    const groupMatch = groupMatches[0]!
    expect(canEnterResult(groupMatch, {})).toBe(true)
  })

  it('returns false for a knockout match with unresolved upstream refs', () => {
    const r32match = knockoutMatches.find((m) => m.stage === 'r32')!
    expect(canEnterResult(r32match, {})).toBe(false)
  })

  it('returns true for a knockout match once both upstream refs are resolved', () => {
    // M73: A2 vs B2
    const m73 = knockoutMatches.find((m) => m.id === 'M73')!
    const results: Record<string, Result> = {}
    groupMatches
      .filter((m) => m.group === 'A' || m.group === 'B')
      .forEach((m) => {
        results[m.id] = makeResult(m.id, 1, 0)
      })
    expect(canEnterResult(m73, results)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Full bracket propagation: R32 → R16 → QF → SF → Final
// ---------------------------------------------------------------------------

describe('full bracket propagation', () => {
  it('resolves M89 (R16) winner once M74 and M77 are played', () => {
    // M89: winner(M74) vs winner(M77)
    // M74: E1 vs 3rd-slot4, so needs all groups complete + M74 result
    // M77: I1 vs 3rd-slot6, same
    const results = allGroupResults(1, 0)
    // Play M73–M88 (all R32)
    for (const m of knockoutMatches.filter((match) => match.stage === 'r32')) {
      results[m.id] = makeResult(m.id, 2, 1)
    }
    // Now M89 home/away should both be resolvable (both their R32 matches played).
    const m89 = knockoutMatches.find((m) => m.id === 'M89')!
    const home = resolveTeamRef(m89.homeRef, results)
    const away = resolveTeamRef(m89.awayRef, results)
    expect(home).not.toBeNull()
    expect(away).not.toBeNull()
    expect(home!.id).not.toBe(away!.id)
  })

  it('resolves the final (M104) participants when all preceding matches are played', () => {
    const results = allGroupResults(1, 0)
    // Play all knockout matches with home wins (2-1).
    for (const m of knockoutMatches) {
      results[m.id] = makeResult(m.id, 2, 1)
    }
    const final = knockoutMatches.find((m) => m.id === 'M104')!
    const home = resolveTeamRef(final.homeRef, results)
    const away = resolveTeamRef(final.awayRef, results)
    expect(home).not.toBeNull()
    expect(away).not.toBeNull()
    expect(home!.id).not.toBe(away!.id)
  })

  it('blocks result entry on M89 when M74 result is missing', () => {
    const results = allGroupResults(1, 0)
    // Play all R32 except M74.
    for (const m of knockoutMatches.filter((match) => match.stage === 'r32' && match.id !== 'M74')) {
      results[m.id] = makeResult(m.id, 2, 1)
    }
    const m89 = knockoutMatches.find((m) => m.id === 'M89')!
    // M89 homeRef is winner(M74) which is unresolved — canEnterResult must be false.
    expect(canEnterResult(m89, results)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// currentBracketColumn
// ---------------------------------------------------------------------------

describe('currentBracketColumn', () => {
  it('returns null while the group stage is still ongoing', () => {
    expect(currentBracketColumn({})).toBeNull()
    const partial = allGroupResults(1, 0)
    delete partial['M72']
    expect(currentBracketColumn(partial)).toBeNull()
  })

  it('returns r32 once the group stage completes and no knockout match has been played', () => {
    expect(currentBracketColumn(allGroupResults(1, 0))).toBe('r32')
  })

  it('returns r16 once every r32 match has a result', () => {
    const results = allGroupResults(1, 0)
    for (const m of knockoutMatches.filter((match) => match.stage === 'r32')) {
      results[m.id] = makeResult(m.id, 2, 1)
    }
    expect(currentBracketColumn(results)).toBe('r16')
  })

  it('returns final once the third-place match is played but the final is not', () => {
    const results = allGroupResults(1, 0)
    for (const m of knockoutMatches.filter((match) => match.stage !== 'final')) {
      results[m.id] = makeResult(m.id, 2, 1)
    }
    expect(currentBracketColumn(results)).toBe('final')
  })

  it('returns final once every knockout match, including the final, has been played', () => {
    const results = allGroupResults(1, 0)
    for (const m of knockoutMatches) {
      results[m.id] = makeResult(m.id, 2, 1)
    }
    expect(currentBracketColumn(results)).toBe('final')
  })
})
