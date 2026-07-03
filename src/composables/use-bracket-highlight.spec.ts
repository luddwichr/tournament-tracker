import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useBracketHighlight } from './use-bracket-highlight'

// ---------------------------------------------------------------------------
// useBracketHighlight — ResizeObserver-driven recompute of connectorPaths
// ---------------------------------------------------------------------------
//
// connectorPaths ultimately reads DOM geometry via useBracketConnectors
// (querySelector + getBoundingClientRect), which Vue's reactivity system
// cannot see. These tests stub a global ResizeObserver, capture the callback
// the composable registers, and fire it manually to simulate a real layout
// shift (window resize, late web-font/flag load, etc.) — proving that
// connectorPaths recomputes even though no *reactive* dependency changed.

type ResizeCallback = () => void

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = []
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

function buildContainer(): { container: HTMLElement; matchCard: HTMLElement } {
  const container = document.createElement('div')
  mockRect(container, { left: 0, top: 0 })

  const fromGroup = document.createElement('div')
  fromGroup.dataset['matchId'] = 'M73'
  container.appendChild(fromGroup)

  const originA = document.createElement('div')
  originA.dataset['refKey'] = 'groupRank:A:2'
  mockRect(originA, { right: 10, top: 10, height: 10 })
  container.appendChild(originA)

  const originB = document.createElement('div')
  originB.dataset['refKey'] = 'groupRank:B:2'
  mockRect(originB, { right: 10, top: 20, height: 10 })
  container.appendChild(originB)

  const toGroup = document.createElement('div')
  toGroup.dataset['matchId'] = 'M90'
  const matchCard = document.createElement('div')
  matchCard.className = 'match-card'
  mockRect(matchCard, { left: 100, top: 30, height: 20 })
  toGroup.appendChild(matchCard)
  container.appendChild(toGroup)

  return { container, matchCard }
}

describe('useBracketHighlight — connectorPaths reactivity to DOM geometry', () => {
  beforeEach(() => {
    FakeResizeObserver.instances = []
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
    mockRect(matchCard, { left: 250, top: 80, height: 20 })
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
