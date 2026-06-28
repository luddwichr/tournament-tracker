import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import {
  matchToRefKeys,
  nextMatchMap,
  prevMatchMap,
  teamRefToMatchId,
  useBracketConnectors,
} from './use-bracket-connectors'

// ---------------------------------------------------------------------------
// Static topology maps (module-level, built once from fixture data)
// ---------------------------------------------------------------------------

describe('nextMatchMap', () => {
  it('maps R32 winners to their R16 match', () => {
    expect(nextMatchMap.get('M74')).toBe('M89') // M89 homeRef
    expect(nextMatchMap.get('M77')).toBe('M89') // M89 awayRef
    expect(nextMatchMap.get('M73')).toBe('M90') // M90 homeRef
    expect(nextMatchMap.get('M75')).toBe('M90') // M90 awayRef
  })

  it('maps R16 winners to their QF match', () => {
    expect(nextMatchMap.get('M89')).toBe('M97')
    expect(nextMatchMap.get('M90')).toBe('M97')
  })

  it('maps SF winners to the final', () => {
    expect(nextMatchMap.get('M101')).toBe('M104')
    expect(nextMatchMap.get('M102')).toBe('M104')
  })

  it('has no entry for the final (no next match)', () => {
    expect(nextMatchMap.has('M104')).toBe(false)
  })

  it('has no entry for the third-place match (matchLoser refs are not tracked)', () => {
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

  it('has no entry for the third-place match (it uses matchLoser refs)', () => {
    expect(prevMatchMap.has('M103')).toBe(false)
  })

  it('covers exactly 15 backward connections (8 R16 + 4 QF + 2 SF + 1 final)', () => {
    expect(prevMatchMap.size).toBe(15)
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

// ---------------------------------------------------------------------------
// useBracketConnectors — geometry composable
// ---------------------------------------------------------------------------

function mockRect(el: HTMLElement, rect: Partial<DOMRect>): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
    ...rect,
  } as DOMRect)
}

describe('useBracketConnectors', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('matchConnector', () => {
    it('returns null when roundsEl is null', () => {
      const { matchConnector } = useBracketConnectors(ref(null), ref(document.createElement('div')))
      expect(matchConnector('M73', 'M90')).toBeNull()
    })

    it('returns null when viewEl is null', () => {
      const { matchConnector } = useBracketConnectors(ref(document.createElement('div')), ref(null))
      expect(matchConnector('M73', 'M90')).toBeNull()
    })

    it('returns null when the from-match element is not in the container', () => {
      const container = document.createElement('div')
      const toGroup = document.createElement('div')
      toGroup.dataset.matchId = 'M90'
      container.appendChild(toGroup)
      const { matchConnector } = useBracketConnectors(ref(container), ref(document.createElement('div')))
      expect(matchConnector('M73', 'M90')).toBeNull()
    })

    it('returns null when the to-match element is not in the container', () => {
      const container = document.createElement('div')
      const fromGroup = document.createElement('div')
      fromGroup.dataset.matchId = 'M73'
      container.appendChild(fromGroup)
      const { matchConnector } = useBracketConnectors(ref(container), ref(document.createElement('div')))
      expect(matchConnector('M73', 'M90')).toBeNull()
    })

    it('returns a cubic bezier SVG path using .match-card bounding rects', () => {
      const scrollEl = document.createElement('div')
      const container = document.createElement('div')
      mockRect(container, { left: 0, top: 0 })

      const fromGroup = document.createElement('div')
      fromGroup.dataset.matchId = 'M73'
      const fromCard = document.createElement('div')
      fromCard.className = 'match-card'
      mockRect(fromCard, { right: 50, top: 20, height: 20 })
      fromGroup.appendChild(fromCard)
      container.appendChild(fromGroup)

      const toGroup = document.createElement('div')
      toGroup.dataset.matchId = 'M90'
      const toCard = document.createElement('div')
      toCard.className = 'match-card'
      mockRect(toCard, { left: 60, top: 30, height: 20 })
      toGroup.appendChild(toCard)
      container.appendChild(toGroup)

      const { matchConnector } = useBracketConnectors(ref(container), ref(scrollEl))

      // x1 = right(50) - containerLeft(0) + scrollLeft(0) = 50
      // y1 = top(20) + height/2(10) - containerTop(0) + scrollTop(0) = 30
      // x2 = left(60) - containerLeft(0) + scrollLeft(0) = 60
      // y2 = top(30) + height/2(10) - containerTop(0) + scrollTop(0) = 40
      // cx = (50 + 60) / 2 = 55
      expect(matchConnector('M73', 'M90')).toBe('M 50 30 C 55 30, 55 40, 60 40')
    })

    it('accounts for container offset and scroll position', () => {
      const scrollEl = document.createElement('div')
      Object.defineProperty(scrollEl, 'scrollLeft', { value: 100 })
      Object.defineProperty(scrollEl, 'scrollTop', { value: 50 })

      const container = document.createElement('div')
      mockRect(container, { left: 10, top: 5 })

      const fromGroup = document.createElement('div')
      fromGroup.dataset.matchId = 'M73'
      const fromCard = document.createElement('div')
      fromCard.className = 'match-card'
      mockRect(fromCard, { right: 50, top: 20, height: 20 })
      fromGroup.appendChild(fromCard)
      container.appendChild(fromGroup)

      const toGroup = document.createElement('div')
      toGroup.dataset.matchId = 'M90'
      const toCard = document.createElement('div')
      toCard.className = 'match-card'
      mockRect(toCard, { left: 60, top: 30, height: 20 })
      toGroup.appendChild(toCard)
      container.appendChild(toGroup)

      const { matchConnector } = useBracketConnectors(ref(container), ref(scrollEl))

      // x1 = 50 - 10 + 100 = 140
      // y1 = 20 + 10 - 5 + 50 = 75
      // x2 = 60 - 10 + 100 = 150
      // y2 = 30 + 10 - 5 + 50 = 85
      // cx = (140 + 150) / 2 = 145
      expect(matchConnector('M73', 'M90')).toBe('M 140 75 C 145 75, 145 85, 150 85')
    })
  })

  describe('originConnector', () => {
    it('returns null when roundsEl is null', () => {
      const { originConnector } = useBracketConnectors(ref(null), ref(document.createElement('div')))
      expect(originConnector('groupRank:A:2', 'M73')).toBeNull()
    })

    it('returns null when viewEl is null', () => {
      const { originConnector } = useBracketConnectors(ref(document.createElement('div')), ref(null))
      expect(originConnector('groupRank:A:2', 'M73')).toBeNull()
    })

    it('returns null when the ref-key element is not in the container', () => {
      const container = document.createElement('div')
      const toGroup = document.createElement('div')
      toGroup.dataset.matchId = 'M73'
      container.appendChild(toGroup)
      const { originConnector } = useBracketConnectors(ref(container), ref(document.createElement('div')))
      expect(originConnector('groupRank:A:2', 'M73')).toBeNull()
    })

    it('returns null when the match element is not in the container', () => {
      const container = document.createElement('div')
      const fromEl = document.createElement('div')
      fromEl.dataset.refKey = 'groupRank:A:2'
      container.appendChild(fromEl)
      const { originConnector } = useBracketConnectors(ref(container), ref(document.createElement('div')))
      expect(originConnector('groupRank:A:2', 'M73')).toBeNull()
    })

    it('returns a cubic bezier SVG path from origin row to match card', () => {
      const scrollEl = document.createElement('div')
      const container = document.createElement('div')
      mockRect(container, { left: 0, top: 0 })

      const fromEl = document.createElement('div')
      fromEl.dataset.refKey = 'groupRank:A:2'
      mockRect(fromEl, { right: 30, top: 15, height: 10 })
      container.appendChild(fromEl)

      const toGroup = document.createElement('div')
      toGroup.dataset.matchId = 'M73'
      const toCard = document.createElement('div')
      toCard.className = 'match-card'
      mockRect(toCard, { left: 60, top: 30, height: 20 })
      toGroup.appendChild(toCard)
      container.appendChild(toGroup)

      const { originConnector } = useBracketConnectors(ref(container), ref(scrollEl))

      // x1 = right(30) - containerLeft(0) + scrollLeft(0) = 30
      // y1 = top(15) + height/2(5) - containerTop(0) + scrollTop(0) = 20
      // x2 = left(60) - containerLeft(0) + scrollLeft(0) = 60
      // y2 = top(30) + height/2(10) - containerTop(0) + scrollTop(0) = 40
      // cx = (30 + 60) / 2 = 45
      expect(originConnector('groupRank:A:2', 'M73')).toBe('M 30 20 C 45 20, 45 40, 60 40')
    })
  })
})
