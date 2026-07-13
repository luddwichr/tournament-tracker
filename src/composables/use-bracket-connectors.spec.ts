// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useBracketConnectors } from './use-bracket-connectors'

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
  })
}

describe('useBracketConnectors', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('matchConnector', () => {
    it('returns null when roundsEl is null', () => {
      const { matchConnector } = useBracketConnectors(ref(null))
      expect(matchConnector('M73', 'M90')).toBeNull()
    })

    it('returns null when the from-match element is not in the container', () => {
      const container = document.createElement('div')
      const toGroup = document.createElement('div')
      toGroup.dataset['matchId'] = 'M90'
      container.appendChild(toGroup)
      const { matchConnector } = useBracketConnectors(ref(container))
      expect(matchConnector('M73', 'M90')).toBeNull()
    })

    it('returns null when the to-match element is not in the container', () => {
      const container = document.createElement('div')
      const fromGroup = document.createElement('div')
      fromGroup.dataset['matchId'] = 'M73'
      container.appendChild(fromGroup)
      const { matchConnector } = useBracketConnectors(ref(container))
      expect(matchConnector('M73', 'M90')).toBeNull()
    })

    it('returns a cubic bezier SVG path using .match-card bounding rects', () => {
      const container = document.createElement('div')
      mockRect(container, { left: 0, top: 0 })

      const fromGroup = document.createElement('div')
      fromGroup.dataset['matchId'] = 'M73'
      const fromCard = document.createElement('div')
      fromCard.className = 'match-card'
      mockRect(fromCard, { right: 50, top: 20, height: 20 })
      fromGroup.appendChild(fromCard)
      container.appendChild(fromGroup)

      const toGroup = document.createElement('div')
      toGroup.dataset['matchId'] = 'M90'
      const toCard = document.createElement('div')
      toCard.className = 'match-card'
      mockRect(toCard, { left: 60, top: 30, height: 20 })
      toGroup.appendChild(toCard)
      container.appendChild(toGroup)

      const { matchConnector } = useBracketConnectors(ref(container))

      // x1 = right(50) - containerLeft(0) = 50
      // y1 = top(20) + height/2(10) - containerTop(0) = 30
      // x2 = left(60) - containerLeft(0) = 60
      // y2 = top(30) + height/2(10) - containerTop(0) = 40
      // cx = (50 + 60) / 2 = 55
      expect(matchConnector('M73', 'M90')).toBe('M 50 30 C 55 30, 55 40, 60 40')
    })

    it('accounts for container offset', () => {
      const container = document.createElement('div')
      mockRect(container, { left: 10, top: 5 })

      const fromGroup = document.createElement('div')
      fromGroup.dataset['matchId'] = 'M73'
      const fromCard = document.createElement('div')
      fromCard.className = 'match-card'
      mockRect(fromCard, { right: 50, top: 20, height: 20 })
      fromGroup.appendChild(fromCard)
      container.appendChild(fromGroup)

      const toGroup = document.createElement('div')
      toGroup.dataset['matchId'] = 'M90'
      const toCard = document.createElement('div')
      toCard.className = 'match-card'
      mockRect(toCard, { left: 60, top: 30, height: 20 })
      toGroup.appendChild(toCard)
      container.appendChild(toGroup)

      const { matchConnector } = useBracketConnectors(ref(container))

      // getBoundingClientRect already reflects scroll, so subtracting container coords
      // gives scroll-invariant SVG positions.
      // x1 = 50 - 10 = 40
      // y1 = 20 + 10 - 5 = 25
      // x2 = 60 - 10 = 50
      // y2 = 30 + 10 - 5 = 35
      // cx = (40 + 50) / 2 = 45
      expect(matchConnector('M73', 'M90')).toBe('M 40 25 C 45 25, 45 35, 50 35')
    })
  })

  describe('originConnector', () => {
    it('returns null when roundsEl is null', () => {
      const { originConnector } = useBracketConnectors(ref(null))
      expect(originConnector('groupRank:A:2', 'M73')).toBeNull()
    })

    it('returns null when the ref-key element is not in the container', () => {
      const container = document.createElement('div')
      const toGroup = document.createElement('div')
      toGroup.dataset['matchId'] = 'M73'
      container.appendChild(toGroup)
      const { originConnector } = useBracketConnectors(ref(container))
      expect(originConnector('groupRank:A:2', 'M73')).toBeNull()
    })

    it('returns null when the match element is not in the container', () => {
      const container = document.createElement('div')
      const fromEl = document.createElement('div')
      fromEl.dataset['refKey'] = 'groupRank:A:2'
      container.appendChild(fromEl)
      const { originConnector } = useBracketConnectors(ref(container))
      expect(originConnector('groupRank:A:2', 'M73')).toBeNull()
    })

    it('returns a cubic bezier SVG path from origin row to match card', () => {
      const container = document.createElement('div')
      mockRect(container, { left: 0, top: 0 })

      const fromEl = document.createElement('div')
      fromEl.dataset['refKey'] = 'groupRank:A:2'
      mockRect(fromEl, { right: 30, top: 15, height: 10 })
      container.appendChild(fromEl)

      const toGroup = document.createElement('div')
      toGroup.dataset['matchId'] = 'M73'
      const toCard = document.createElement('div')
      toCard.className = 'match-card'
      mockRect(toCard, { left: 60, top: 30, height: 20 })
      toGroup.appendChild(toCard)
      container.appendChild(toGroup)

      const { originConnector } = useBracketConnectors(ref(container))

      // x1 = right(30) - containerLeft(0) = 30
      // y1 = top(15) + height/2(5) - containerTop(0) = 20
      // x2 = left(60) - containerLeft(0) = 60
      // y2 = top(30) + height/2(10) - containerTop(0) = 40
      // cx = (30 + 60) / 2 = 45
      expect(originConnector('groupRank:A:2', 'M73')).toBe('M 30 20 C 45 20, 45 40, 60 40')
    })
  })
})
