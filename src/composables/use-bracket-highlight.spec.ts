// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useBracketHighlight } from './use-bracket-highlight'

// connectorPaths ultimately reads DOM geometry via useBracketConnectors, using querySelector and
// getBoundingClientRect.
// Vue's reactivity system cannot see that.
// These tests stub a global ResizeObserver, capture the callback the composable registers, and fire it manually.
// That simulates a real layout shift such as a window resize or a late web-font or flag load.
// It proves that connectorPaths recomputes even though no *reactive* dependency changed.

type ResizeCallback = () => void

class FakeResizeObserver {
  static readonly instances: FakeResizeObserver[] = []
  callback: ResizeCallback
  observed: Element[] = []
  disconnected = false

  constructor(callback: ResizeCallback) {
    this.callback = callback
    FakeResizeObserver.instances.push(this)
  }

  observe(el: Element): void {
    this.observed.push(el)
  }

  disconnect(): void {
    this.disconnected = true
  }
}

function mockRect(el: HTMLElement, rect: Partial<DOMRect>): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    toJSON: () => ({}),
    top: 0,
    width: 0,
    x: 0,
    y: 0,
    ...rect,
  })
}

function buildContainer(): { container: HTMLElement; matchCard: HTMLElement } {
  const container = document.createElement('div')
  mockRect(container, { left: 0, top: 0 })

  const fromGroup = document.createElement('div')
  fromGroup.dataset['matchId'] = 'M73'
  container.appendChild(fromGroup)

  const originA = document.createElement('div')
  originA.dataset['refKey'] = 'groupRank:A:2'
  mockRect(originA, { height: 10, right: 10, top: 10 })
  container.appendChild(originA)

  const originB = document.createElement('div')
  originB.dataset['refKey'] = 'groupRank:B:2'
  mockRect(originB, { height: 10, right: 10, top: 20 })
  container.appendChild(originB)

  const toGroup = document.createElement('div')
  toGroup.dataset['matchId'] = 'M90'
  const matchCard = document.createElement('div')
  matchCard.dataset['connectorAnchor'] = ''
  mockRect(matchCard, { height: 20, left: 100, top: 30 })
  toGroup.appendChild(matchCard)
  container.appendChild(toGroup)

  return { container, matchCard }
}

describe('useBracketHighlight — connectorPaths reactivity to DOM geometry', () => {
  beforeEach(() => {
    FakeResizeObserver.instances.length = 0
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('observes roundsEl and recomputes connectorPaths when it fires', () => {
    const { container, matchCard } = buildContainer()
    const roundsEl = ref<HTMLElement | null>(container)

    const { connectorPaths, toggleMatchPin } = useBracketHighlight(roundsEl)
    toggleMatchPin('M73')

    const before = connectorPaths.value
    expect(before.length).toBeGreaterThan(0)

    expect(FakeResizeObserver.instances).toHaveLength(1)
    const observer = FakeResizeObserver.instances[0]!
    expect(observer.observed).toEqual([container])

    // Simulate a layout shift the composable has no other way of detecting.
    mockRect(matchCard, { height: 20, left: 250, top: 80 })
    observer.callback()

    const after = connectorPaths.value
    expect(after).not.toEqual(before)
  })

  it('disconnects the previous observer when roundsEl changes', async () => {
    const { container } = buildContainer()
    const roundsEl = ref<HTMLElement | null>(container)
    useBracketHighlight(roundsEl)

    const first = FakeResizeObserver.instances[0]!
    expect(first.disconnected).toBe(false)

    roundsEl.value = null
    await nextTick()
    expect(first.disconnected).toBe(true)
  })
})

// These tests rely on the real bracket graph (src/lib/bracket-graph.ts),
// built from src/data/fixtures-2026.ts. For the fixtures the DOM built by
// buildContainer() represents:
//   - M73 is an r32 match fed by origins groupRank:A:2 and groupRank:B:2,
//     feeding into M90 (its only next match, no prev match).
//   - M90 is fed by M73 (and M75, absent from the test DOM), feeding into
//     M97 (absent from the test DOM). M90 has no origin ref keys of its own.
// So activating M73 yields 3 connector paths (1 to M90, 2 origin connectors);
// activating M90 yields 1 connector path (from M73; the M75/M97 links can't
// render since those elements aren't in the test DOM).

describe('useBracketHighlight — hover-beats-pin precedence', () => {
  it('lets a hovered match win over a pinned one, and reasserts the pin once hover ends', () => {
    const { container } = buildContainer()
    const roundsEl = ref<HTMLElement | null>(container)
    const { highlightedMatchIds, onMatchHover, onMatchHoverEnd, toggleMatchPin } = useBracketHighlight(roundsEl)

    toggleMatchPin('M73')
    expect(highlightedMatchIds.value).toEqual(['M90'])

    onMatchHover('M90')
    expect(highlightedMatchIds.value).toEqual(['M97', 'M73', 'M75'])

    onMatchHoverEnd()
    expect(highlightedMatchIds.value).toEqual(['M90'])
  })

  it('reflects the pinned match in connectorPaths while nothing is hovered', () => {
    const { container } = buildContainer()
    const roundsEl = ref<HTMLElement | null>(container)
    const { connectorPaths, toggleMatchPin } = useBracketHighlight(roundsEl)

    toggleMatchPin('M73')
    expect(connectorPaths.value).toHaveLength(3)
  })
})

describe('useBracketHighlight — ref-key vs match-id connector/highlight selection', () => {
  it('shows the single origin connector on a team-ref hover, clearing any active match highlight', () => {
    const { container } = buildContainer()
    const roundsEl = ref<HTMLElement | null>(container)
    const { connectorPaths, highlightedMatchIds, highlightedRefKeys, onMatchHover, onTeamRefHover } =
      useBracketHighlight(roundsEl)

    onMatchHover('M73')
    expect(connectorPaths.value).toHaveLength(3)

    onTeamRefHover('groupRank:A:2')
    expect(connectorPaths.value).toHaveLength(1)
    expect(highlightedMatchIds.value).toEqual(['M73'])
    expect(highlightedRefKeys.value).toEqual(['groupRank:A:2'])
  })

  it('shows the full connector/highlight set on a match hover or pin', () => {
    const { container } = buildContainer()
    const roundsEl = ref<HTMLElement | null>(container)
    const { connectorPaths, highlightedMatchIds, highlightedRefKeys, onMatchHover } = useBracketHighlight(roundsEl)

    onMatchHover('M73')
    expect(connectorPaths.value).toHaveLength(3)
    expect(highlightedMatchIds.value).toEqual(['M90'])
    expect(highlightedRefKeys.value).toEqual(['groupRank:A:2', 'groupRank:B:2'])
  })

  it('clears the team-ref highlight once a match takes over via hover', () => {
    const { container } = buildContainer()
    const roundsEl = ref<HTMLElement | null>(container)
    const { highlightedRefKeys, onMatchHover, onTeamRefHover } = useBracketHighlight(roundsEl)

    onTeamRefHover('groupRank:A:2')
    expect(highlightedRefKeys.value).toEqual(['groupRank:A:2'])

    onMatchHover('M90')
    expect(highlightedRefKeys.value).toEqual([])
  })
})

describe('useBracketHighlight — pin toggling', () => {
  it('toggles pinnedMatchId on and off when called twice with the same id', () => {
    const { container } = buildContainer()
    const roundsEl = ref<HTMLElement | null>(container)
    const { pinnedMatchId, toggleMatchPin } = useBracketHighlight(roundsEl)

    expect(pinnedMatchId.value).toBeNull()

    toggleMatchPin('M73')
    expect(pinnedMatchId.value).toBe('M73')

    toggleMatchPin('M73')
    expect(pinnedMatchId.value).toBeNull()
  })

  it('switches the pin to a different match id rather than toggling it off', () => {
    const { container } = buildContainer()
    const roundsEl = ref<HTMLElement | null>(container)
    const { pinnedMatchId, toggleMatchPin } = useBracketHighlight(roundsEl)

    toggleMatchPin('M73')
    toggleMatchPin('M90')
    expect(pinnedMatchId.value).toBe('M90')
  })

  it('onMatchHover clears any team-ref hover', () => {
    const { container } = buildContainer()
    const roundsEl = ref<HTMLElement | null>(container)
    const { connectorPaths, onMatchHover, onTeamRefHover } = useBracketHighlight(roundsEl)

    onTeamRefHover('groupRank:A:2')
    onMatchHover('M73')
    // If hoveredRefKey were still set, connectorPaths would be the single
    // origin connector (length 1) instead of the full M73 set (length 3).
    expect(connectorPaths.value).toHaveLength(3)
  })

  it('onTeamRefHover clears any hovered match', () => {
    const { container } = buildContainer()
    const roundsEl = ref<HTMLElement | null>(container)
    const { highlightedMatchIds, onMatchHover, onTeamRefHover } = useBracketHighlight(roundsEl)

    onMatchHover('M73')
    onTeamRefHover('groupRank:B:2')
    // If hoveredMatchId were still set, highlightedMatchIds would also
    // include M90 (M73's next match) alongside the ref's own match id.
    expect(highlightedMatchIds.value).toEqual(['M73'])
  })
})
