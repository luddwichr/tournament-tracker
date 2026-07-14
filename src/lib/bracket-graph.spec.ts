import { describe, expect, it } from 'vitest'
import { matchToRefKeys, nextMatchMap, prevMatchMap, teamRefToMatchId } from './bracket-graph'

describe('nextMatchMap', () => {
  it('maps R32 winners to their R16 match', () => {
    expect(nextMatchMap.get('M74')).toEqual(['M89']) // M89 homeRef
    expect(nextMatchMap.get('M77')).toEqual(['M89']) // M89 awayRef
    expect(nextMatchMap.get('M73')).toEqual(['M90']) // M90 homeRef
    expect(nextMatchMap.get('M75')).toEqual(['M90']) // M90 awayRef
  })

  it('maps R16 winners to their QF match', () => {
    expect(nextMatchMap.get('M89')).toEqual(['M97'])
    expect(nextMatchMap.get('M90')).toEqual(['M97'])
  })

  it('maps SF matches to both the third-place play-off (loser) and the final (winner)', () => {
    expect(nextMatchMap.get('M101')).toEqual(['M103', 'M104'])
    expect(nextMatchMap.get('M102')).toEqual(['M103', 'M104'])
  })

  it('has no entry for the final (no next match)', () => {
    expect(nextMatchMap.has('M104')).toBe(false)
  })

  it('has no entry for the third-place match (no next match)', () => {
    expect(nextMatchMap.has('M103')).toBe(false)
  })

  it('covers exactly 30 forward connections (16 R32 + 8 R16 + 4 QF + 2 SF)', () => {
    expect(nextMatchMap.size).toBe(30)
  })
})

describe('prevMatchMap', () => {
  it('maps M89 to its two R32 source matches', () => {
    expect(prevMatchMap.get('M89')).toEqual(['M74', 'M77'])
  })

  it('maps M90 to its two R32 source matches', () => {
    expect(prevMatchMap.get('M90')).toEqual(['M73', 'M75'])
  })

  it('maps M97 to its two R16 source matches', () => {
    expect(prevMatchMap.get('M97')).toEqual(['M89', 'M90'])
  })

  it('maps the final to its two SF sources', () => {
    expect(prevMatchMap.get('M104')).toEqual(['M101', 'M102'])
  })

  it('has no entry for R32 matches (their refs are groupRank/thirdPlace, not matchWinner)', () => {
    expect(prevMatchMap.has('M73')).toBe(false)
    expect(prevMatchMap.has('M74')).toBe(false)
  })

  it('maps the third-place match to its two SF sources (via matchLoser refs)', () => {
    expect(prevMatchMap.get('M103')).toEqual(['M101', 'M102'])
  })

  it('covers exactly 16 backward connections (8 R16 + 4 QF + 2 SF + 1 final + 1 third-place)', () => {
    expect(prevMatchMap.size).toBe(16)
  })
})

describe('teamRefToMatchId', () => {
  it('maps groupRank refs to the R32 match they appear in', () => {
    expect(teamRefToMatchId.get('groupRank:A:2')).toBe('M73')
    expect(teamRefToMatchId.get('groupRank:B:2')).toBe('M73')
    expect(teamRefToMatchId.get('groupRank:E:1')).toBe('M74')
  })

  it('maps thirdPlace slot refs to the R32 match they appear in', () => {
    expect(teamRefToMatchId.get('thirdPlace:4')).toBe('M74')
  })

  it('covers exactly 32 ref keys (16 R32 matches × 2 refs each)', () => {
    expect(teamRefToMatchId.size).toBe(32)
  })
})

describe('matchToRefKeys', () => {
  it('maps M73 to both its origin ref keys in home-then-away order', () => {
    expect(matchToRefKeys.get('M73')).toEqual(['groupRank:A:2', 'groupRank:B:2'])
  })

  it('maps M74 to its groupRank and thirdPlace ref keys', () => {
    expect(matchToRefKeys.get('M74')).toEqual(['groupRank:E:1', 'thirdPlace:4'])
  })

  it('covers exactly 16 R32 match keys', () => {
    expect(matchToRefKeys.size).toBe(16)
  })

  it('is the exact inverse of teamRefToMatchId', () => {
    for (const [refKey, matchId] of teamRefToMatchId) {
      expect(matchToRefKeys.get(matchId)).toContain(refKey)
    }
  })
})
