import { describe, it, expect } from 'vitest'

import { teams, teamsById } from './teams'
import { fixtures, groupMatches, knockoutMatches, THIRD_PLACE_SLOT_HOST, THIRD_PLACE_ALLOCATION } from './fixtures-2026'
import { GROUP_IDS, type GroupId } from '../types/tournament'

const countStage = (stage: string) => knockoutMatches.filter((m) => m.stage === stage).length
const matchNum = (id: string) => Number(id.slice(1))

describe('teams', () => {
  it('has all 48 qualified teams', () => {
    expect(teams).toHaveLength(48)
  })

  it('splits into 12 groups of exactly 4', () => {
    for (const g of GROUP_IDS) {
      expect(teams.filter((t) => t.group === g)).toHaveLength(4)
    }
  })

  it('has unique ids', () => {
    expect(new Set(teams.map((t) => t.id)).size).toBe(48)
  })

  it('gives every team a positive FIFA ranking', () => {
    for (const t of teams) {
      expect(t.fifaRanking).toBeGreaterThan(0)
      expect(Number.isInteger(t.fifaRanking)).toBe(true)
    }
  })

  it('gives every team a non-empty German name and flag code', () => {
    for (const t of teams) {
      expect(t.name.length).toBeGreaterThan(0)
      expect(t.flagCode).toMatch(/^[a-z]{2}(-[a-z]{3})?$/)
    }
  })
})

describe('fixtures', () => {
  it('has exactly 104 matches', () => {
    expect(fixtures).toHaveLength(104)
    expect(groupMatches).toHaveLength(72)
    expect(knockoutMatches).toHaveLength(32)
  })

  it('has 104 unique match ids', () => {
    expect(new Set(fixtures.map((m) => m.id)).size).toBe(104)
  })

  it('has a parseable ISO kickoff for every match', () => {
    for (const m of fixtures) {
      expect(Number.isNaN(Date.parse(m.kickoff))).toBe(false)
    }
  })

  it('has the expected number of matches per knockout stage', () => {
    expect(countStage('r32')).toBe(16)
    expect(countStage('r16')).toBe(8)
    expect(countStage('qf')).toBe(4)
    expect(countStage('sf')).toBe(2)
    expect(countStage('third')).toBe(1)
    expect(countStage('final')).toBe(1)
  })
})

describe('group stage', () => {
  it('references only real teams that belong to the match group', () => {
    for (const m of groupMatches) {
      expect(m.group).toBeDefined()
      for (const ref of [m.homeRef, m.awayRef]) {
        expect(ref.kind).toBe('team')
        const team = teamsById.get(ref.teamId)
        expect(team, `unknown team ${ref.teamId}`).toBeDefined()
        expect(team!.group).toBe(m.group)
      }
    }
  })

  it('makes every team play exactly 3 group matches', () => {
    const count = new Map<string, number>()
    for (const m of groupMatches) {
      for (const ref of [m.homeRef, m.awayRef]) {
        count.set(ref.teamId, (count.get(ref.teamId) ?? 0) + 1)
      }
    }
    expect(count.size).toBe(48)
    for (const t of teams) expect(count.get(t.id)).toBe(3)
  })

  it('plays 6 matches in every group, never a team against itself', () => {
    for (const g of GROUP_IDS) {
      const ms = groupMatches.filter((m) => m.group === g)
      expect(ms).toHaveLength(6)
      for (const m of ms) {
        expect(m.homeRef.teamId).not.toBe(m.awayRef.teamId)
      }
    }
  })
})

describe('knockout bracket reachability', () => {
  const ids = new Set(fixtures.map((m) => m.id))

  it('resolves every knockout reference to a valid group, slot or earlier match', () => {
    for (const m of knockoutMatches) {
      for (const ref of [m.homeRef, m.awayRef]) {
        switch (ref.kind) {
          case 'groupRank': {
            expect(GROUP_IDS).toContain(ref.group)
            expect([1, 2]).toContain(ref.rank)
            break
          }
          case 'thirdPlace': {
            expect(ref.slot).toBeGreaterThanOrEqual(1)
            expect(ref.slot).toBeLessThanOrEqual(8)
            break
          }
          case 'matchWinner':
          case 'matchLoser': {
            expect(ids.has(ref.matchId), `dangling ${ref.matchId}`).toBe(true)
            // referenced match is always played earlier
            expect(matchNum(ref.matchId)).toBeLessThan(matchNum(m.id))
            break
          }
          default: {
            throw new Error(`group-style ref in knockout match ${m.id}`)
          }
        }
      }
    }
  })

  it('uses each group winner and runner-up exactly once across the round of 32', () => {
    const seen = new Set<string>()
    for (const m of knockoutMatches.filter((x) => x.stage === 'r32')) {
      for (const ref of [m.homeRef, m.awayRef]) {
        if (ref.kind === 'groupRank') {
          const key = `${ref.group}${ref.rank}`
          expect(seen.has(key)).toBe(false)
          seen.add(key)
        }
      }
    }
    // 12 winners + 12 runners-up = 24 group slots; 8 winners face third-placed teams
    expect(seen.size).toBe(24)
  })

  it('feeds the third-place play-off and final from the two semi-finals', () => {
    const third = knockoutMatches.find((m) => m.stage === 'third')!
    const final = knockoutMatches.find((m) => m.stage === 'final')!
    expect(third.homeRef).toEqual({ kind: 'matchLoser', matchId: 'M101' })
    expect(third.awayRef).toEqual({ kind: 'matchLoser', matchId: 'M102' })
    expect(final.homeRef).toEqual({ kind: 'matchWinner', matchId: 'M101' })
    expect(final.awayRef).toEqual({ kind: 'matchWinner', matchId: 'M102' })
  })
})

describe('third-place allocation table', () => {
  const hosts = Object.values(THIRD_PLACE_SLOT_HOST)

  it('maps all 8 slots to distinct host groups', () => {
    expect(new Set(hosts).size).toBe(8)
  })

  it('agrees with the actual round-of-32 fixtures (no drift between table and bracket)', () => {
    // Every `thirdPlace` slot in the R32 is the away side of exactly one match
    // whose home side is that slot host's group winner. This ties the lookup
    // table back to the bracket so the two cannot silently diverge.
    const slotsSeen = new Set<number>()
    for (const m of knockoutMatches.filter((x) => x.stage === 'r32')) {
      if (m.awayRef.kind !== 'thirdPlace') continue
      const slot = m.awayRef.slot
      expect(slotsSeen.has(slot)).toBe(false)
      slotsSeen.add(slot)
      expect(m.homeRef.kind).toBe('groupRank')
      if (m.homeRef.kind === 'groupRank') {
        expect(m.homeRef.rank).toBe(1)
        expect(m.homeRef.group).toBe(THIRD_PLACE_SLOT_HOST[slot])
      }
    }
    expect(slotsSeen.size).toBe(8)
  })

  it('covers all 495 combinations of 8 groups out of 12', () => {
    expect(Object.keys(THIRD_PLACE_ALLOCATION)).toHaveLength(495)
  })

  it('keys every row by 8 distinct sorted group letters', () => {
    for (const key of Object.keys(THIRD_PLACE_ALLOCATION)) {
      expect(key).toHaveLength(8)
      const letters = [...key]
      expect(new Set(letters).size).toBe(8)
      expect(letters.toSorted().join('')).toBe(key)
      for (const l of letters) expect(GROUP_IDS).toContain(l as GroupId)
    }
  })

  it('assigns, in every row, the eight qualifying groups to the eight host slots', () => {
    for (const [key, mapping] of Object.entries(THIRD_PLACE_ALLOCATION)) {
      // one assignment per host group
      expect(Object.keys(mapping).toSorted().join('')).toBe(hosts.toSorted().join(''))
      // the assigned third-placed groups are exactly the qualifying set
      expect(Object.values(mapping).toSorted().join('')).toBe(key)
    }
  })
})
