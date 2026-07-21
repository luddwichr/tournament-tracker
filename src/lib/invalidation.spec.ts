import { allGroupResults, makeResult } from '../test-support/results'
import { describe, expect, it } from 'vitest'
import { invalidatedDownstream, invalidatedMatchLabel, withResolvableKnockoutResults } from './invalidation'
import type { Result } from '../types/tournament'
import { knockoutMatches } from '../data/fixtures-2026'
import { resolveTeamRef } from './knockout'
import { teamRefLabel } from './bracket-labels'

describe('invalidatedDownstream', () => {
  it('flags the R32 match fed by a flipped group rank 1/2, cascading into a fed R16 match with its own stored result', () => {
    const results: Record<string, Result> = { ...allGroupResults(1, 0) }

    // M79: R32 slot for Group A's rank-1 team (vs. the best 3rd-placed team).
    const m79 = knockoutMatches.find(
      (m) => m.homeRef.kind === 'groupRank' && m.homeRef.group === 'A' && m.homeRef.rank === 1,
    )!
    // The R16 slot fed by M79's winner.
    const m92 = knockoutMatches.find(
      (m) =>
        (m.homeRef.kind === 'matchWinner' && m.homeRef.matchId === m79.id) ||
        (m.awayRef.kind === 'matchWinner' && m.awayRef.matchId === m79.id),
    )!
    results[m79.id] = makeResult(m79.id, 2, 1)
    results[m92.id] = makeResult(m92.id, 1, 0)

    // M53 is Tschechien (home) vs Mexiko (away).
    // Under the baseline, where every group match is 1:0 to the home side, Tschechien and Mexiko are tied on points.
    // Tschechien wins the head-to-head 1:0 and takes Group A's rank 1.
    // Replaying M53 as a 0:3 away win flips that head-to-head, so Mexiko takes rank 1 instead.
    const flipped = makeResult('M53', 0, 3)

    expect(invalidatedDownstream(results, 'M53', flipped)).toEqual([m79.id, m92.id])
  })

  it('does not flag anything for a score-only edit that leaves the group order unchanged', () => {
    const results: Record<string, Result> = { ...allGroupResults(1, 0) }
    const m79 = knockoutMatches.find(
      (m) => m.homeRef.kind === 'groupRank' && m.homeRef.group === 'A' && m.homeRef.rank === 1,
    )!
    results[m79.id] = makeResult(m79.id, 2, 1)

    // M01 goes from Mexiko (home) 1:0 to 2:0, so Mexiko still wins the match.
    // Group A's rank 1/2 order is decided by the M53 head-to-head, which this edit doesn't touch.
    // So nothing downstream changes.
    expect(invalidatedDownstream(results, 'M01', makeResult('M01', 2, 0))).toEqual([])
  })

  it('flags a downstream R16 match, cascading into a QF match with its own stored result, when a knockout edit flips the winner', () => {
    const results: Record<string, Result> = { ...allGroupResults(1, 0) }
    results['M73'] = makeResult('M73', 2, 1) // home (Group A rank 2) wins
    results['M75'] = makeResult('M75', 2, 1) // M90's other feeder, needed so M90 itself resolves
    results['M90'] = makeResult('M90', 2, 1) // R16, fed by M73's winner
    results['M97'] = makeResult('M97', 2, 1) // QF, fed by M90's winner

    expect(invalidatedDownstream(results, 'M73', makeResult('M73', 1, 2))).toEqual(['M90', 'M97'])
  })

  it('does not flag anything when a knockout edit keeps the same winner', () => {
    const results: Record<string, Result> = { ...allGroupResults(1, 0) }
    results['M73'] = makeResult('M73', 2, 1)
    results['M90'] = makeResult('M90', 2, 1)

    expect(invalidatedDownstream(results, 'M73', makeResult('M73', 3, 1))).toEqual([])
  })

  it('flags groupRank-fed and thirdPlace-fed R32 matches when clearing a group result makes that group incomplete', () => {
    const results: Record<string, Result> = { ...allGroupResults(1, 0) }
    results['M73'] = makeResult('M73', 2, 1) // groupRank-fed: home = Group A rank 2
    results['M85'] = makeResult('M85', 2, 1) // thirdPlace-fed: away = slot 2 (an unrelated group)

    // M01 is one of Group A's six matches, so clearing it makes Group A incomplete.
    // That unresolves M73's groupRank ref.
    // It also unresolves every thirdPlace ref across the whole bracket, including M85's.
    // That is because the third-place ranking requires all 12 groups to be complete.
    expect(invalidatedDownstream(results, 'M01', null)).toEqual(['M73', 'M85'])
  })

  it('never flags the edited match itself, and ignores downstream matches with no stored result', () => {
    const results: Record<string, Result> = { ...allGroupResults(1, 0) }
    results['M73'] = makeResult('M73', 2, 1)
    // M90 (fed by M73's winner) intentionally has no stored result here.

    const invalidated = invalidatedDownstream(results, 'M73', makeResult('M73', 1, 2))

    expect(invalidated).not.toContain('M73')
    expect(invalidated).toEqual([])
  })

  it('flags downstream matches when a cards-only edit flips the group order via the fair-play tiebreaker', () => {
    const results: Record<string, Result> = { ...allGroupResults(0, 0) }
    const m73 = knockoutMatches.find(
      (m) => m.homeRef.kind === 'groupRank' && m.homeRef.group === 'A' && m.homeRef.rank === 2,
    )!
    results[m73.id] = makeResult(m73.id, 2, 1)

    // M28: Mexiko (home) vs Südkorea (away), both 0:0 like every other Group
    // A match. With no cards anywhere, Group A's order is decided purely by
    // FIFA ranking (Mexiko, Südkorea, Tschechien, Südafrika). Giving Mexiko
    // two red cards drops its fair-play score below the rest, moving
    // Südkorea into rank 2.
    const flipped = makeResult('M28', 0, 0, { homeRed: 2 })

    expect(invalidatedDownstream(results, 'M28', flipped)).toEqual([m73.id])
  })
})

describe('withResolvableKnockoutResults', () => {
  // M89 is the R16 slot fed by the winners of M74 and M77.
  const m89 = knockoutMatches.find((m) => m.id === 'M89')!

  it('returns the input itself when every knockout result resolves', () => {
    const results: Record<string, Result> = { ...allGroupResults(1, 0), M74: makeResult('M74', 2, 1) }

    expect(withResolvableKnockoutResults(results)).toBe(results)
  })

  it('keeps a group-only map untouched', () => {
    const results = allGroupResults(1, 0)

    expect(withResolvableKnockoutResults(results)).toBe(results)
  })

  it('drops a knockout result whose participants cannot be resolved', () => {
    const results: Record<string, Result> = { ...allGroupResults(1, 0), [m89.id]: makeResult(m89.id, 1, 0) }

    const swept = withResolvableKnockoutResults(results)

    expect(swept[m89.id]).toBeUndefined()
    expect(Object.keys(swept)).toHaveLength(Object.keys(results).length - 1)
  })

  it('drops the whole subtree below an orphan', () => {
    // M97 is the quarter-final fed by M89's winner, so it is unresolvable for as long as M89 is.
    const m97 = knockoutMatches.find(
      (m) =>
        (m.homeRef.kind === 'matchWinner' && m.homeRef.matchId === m89.id) ||
        (m.awayRef.kind === 'matchWinner' && m.awayRef.matchId === m89.id),
    )!
    const results: Record<string, Result> = {
      [m89.id]: makeResult(m89.id, 1, 0),
      [m97.id]: makeResult(m97.id, 2, 0),
    }

    expect(withResolvableKnockoutResults(results)).toEqual({})
  })

  it('keeps a level knockout result, whose participants are known even though its winner is not', () => {
    const results: Record<string, Result> = { ...allGroupResults(1, 0), M74: makeResult('M74', 1, 1) }

    expect(withResolvableKnockoutResults(results)['M74']).toEqual(makeResult('M74', 1, 1))
  })
})

describe('invalidatedMatchLabel', () => {
  it('shows the stage, match number, and resolved team names', () => {
    const results: Record<string, Result> = { ...allGroupResults(1, 0) }
    const m73 = knockoutMatches.find((m) => m.id === 'M73')!
    const home = resolveTeamRef(m73.homeRef, results)!
    const away = resolveTeamRef(m73.awayRef, results)!

    expect(invalidatedMatchLabel('M73', results)).toBe(`Runde der 32 (Spiel 73): ${home.name} – ${away.name}`)
  })

  it('falls back to teamRefLabel when a participant is unresolved', () => {
    const m73 = knockoutMatches.find((m) => m.id === 'M73')!

    expect(invalidatedMatchLabel('M73', {})).toBe(
      `Runde der 32 (Spiel 73): ${teamRefLabel(m73.homeRef)} – ${teamRefLabel(m73.awayRef)}`,
    )
  })

  it('throws for a non-knockout match id (defensive — invalidatedDownstream never returns one)', () => {
    // M01 is a group match.
    expect(() => invalidatedMatchLabel('M01', {})).toThrow("'M01' is not a knockout match")
  })

  it('throws for an unknown match id', () => {
    expect(() => invalidatedMatchLabel('NOPE', {})).toThrow("'NOPE' is not a knockout match")
  })
})
