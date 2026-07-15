// @vitest-environment jsdom
import type { Result, ResultsMap } from '../types/tournament'
import { SCHEMA_VERSION, clearLegacyResults, exportJson, parseImport, readLegacyResults } from './persistence'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeResult } from '../test-support/results'

function validResult(matchId: string, extra: Partial<Result> = {}): Result {
  return makeResult(matchId, 1, 0, extra)
}

function serialise(results: ResultsMap, version: number = SCHEMA_VERSION): string {
  return JSON.stringify({ results, version })
}

/** A shootout-decided result on M73, the first knockout match (R32). */
function shootoutResult(extra: Partial<Result> = {}): Result {
  return makeResult('M73', 1, 1, { awayShootoutGoals: 2, homeShootoutGoals: 4, ...extra })
}

describe('parseImport', () => {
  it('returns the results map from a valid export', () => {
    const results = { M01: validResult('M01') }
    const out = parseImport(serialise(results))
    expect(out).toEqual(results)
  })

  it('throws on invalid JSON', () => {
    expect(() => parseImport('not json {')).toThrow('Ungültiges JSON-Format.')
  })

  it('throws on wrong version number', () => {
    const json = JSON.stringify({ results: {}, version: 99 })
    expect(() => parseImport(json)).toThrow(/Unbekanntes Dateiformat/)
  })

  it('throws on missing results key', () => {
    const json = JSON.stringify({ version: 1 })
    expect(() => parseImport(json)).toThrow(/Unbekanntes Dateiformat/)
  })

  it('throws on a non-object results value', () => {
    const json = JSON.stringify({ results: 'bad', version: 1 })
    expect(() => parseImport(json)).toThrow(/Unbekanntes Dateiformat/)
  })

  it('throws when results is an array (typeof [] === "object" would otherwise slip through)', () => {
    const json = JSON.stringify({ results: [validResult('M01')], version: 1 })
    expect(() => parseImport(json)).toThrow(/Unbekanntes Dateiformat/)
  })

  it('throws when a result is keyed by an id that is not a real fixture', () => {
    const json = JSON.stringify({ results: { NOPE: validResult('NOPE') }, version: 1 })
    expect(() => parseImport(json)).toThrow(/Unbekanntes Dateiformat/)
  })

  it("throws when a result's matchId does not match the key it's stored under", () => {
    // Stored under M01 but claims to be M02 — invisible/unresolvable per REQUIREMENTS.md §9.8.
    const json = JSON.stringify({ results: { M01: validResult('M02') }, version: 1 })
    expect(() => parseImport(json)).toThrow(/Unbekanntes Dateiformat/)
  })

  it('throws when a result is missing required numeric fields', () => {
    const bad = { awayGoals: 0, homeGoals: 1, matchId: 'M01' } // missing card fields
    const json = JSON.stringify({ results: { M01: bad }, version: 1 })
    expect(() => parseImport(json)).toThrow(/Unbekanntes Dateiformat/)
  })

  // Corrupt-import cases that must be caught by isNonNegativeInteger (used
  // inside isValidResult) and the matchId type check. Each row's override is
  // inlined as raw JSON text rather than JSON.stringify'd, since that lets us
  // express a value — like a number that overflows to Infinity — that
  // JSON.stringify cannot produce (it turns Infinity/NaN into `null`) but
  // JSON.parse can.
  it.each([
    ['a negative goal count', '"homeGoals":-1'],
    ['a fractional goal count', '"homeGoals":1.5'],
    ['a non-finite goal count (numeric overflow to Infinity)', '"homeGoals":1e400'],
    ['a non-string matchId', '"matchId":123'],
  ])('rejects an import with %s', (_label, fieldOverride) => {
    const json = `{"version":1,"results":{"M01":{"matchId":"M01","homeGoals":1,"awayGoals":0,"homeYellow":0,"homeRed":0,"awayYellow":0,"awayRed":0,${fieldOverride}}}}`
    expect(() => parseImport(json)).toThrow(/Unbekanntes Dateiformat/)
  })

  it('accepts a version-1 export file (legacy, no shootout fields)', () => {
    const results = { M01: validResult('M01') }
    expect(parseImport(serialise(results, 1))).toEqual(results)
  })

  describe('shootout fields', () => {
    it('accepts a knockout result decided by shootout', () => {
      const results = { M73: shootoutResult() }
      expect(parseImport(serialise(results))).toEqual(results)
    })

    it.each([
      ['on a group match', { M01: makeResult('M01', 1, 1, { awayShootoutGoals: 2, homeShootoutGoals: 4 }) }],
      ['with only one side set', { M73: makeResult('M73', 1, 1, { homeShootoutGoals: 4 }) }],
      ['with a non-level regular score', { M73: shootoutResult({ homeGoals: 2 }) }],
      ['with a level shootout score', { M73: shootoutResult({ awayShootoutGoals: 4 }) }],
      ['with a negative shootout goal count', { M73: shootoutResult({ homeShootoutGoals: -4 }) }],
      ['with a fractional shootout goal count', { M73: shootoutResult({ homeShootoutGoals: 4.5 }) }],
    ])('rejects a shootout %s', (_label, results) => {
      expect(() => parseImport(serialise(results))).toThrow(/Unbekanntes Dateiformat/)
    })
  })
})

// ---------------------------------------------------------------------------
// readLegacyResults / clearLegacyResults (v1 → v2 localStorage migration)
// ---------------------------------------------------------------------------

describe('readLegacyResults / clearLegacyResults', () => {
  const LEGACY_KEY = 'wc2026:results:v1'

  afterEach(() => {
    localStorage.clear()
  })

  it('returns null when no v1 entry exists', () => {
    expect(readLegacyResults()).toBeNull()
  })

  it("returns the results from a valid v1 entry (the plugin's `{ results }` shape)", () => {
    const results = { M01: validResult('M01') }
    localStorage.setItem(LEGACY_KEY, JSON.stringify({ results }))
    expect(readLegacyResults()).toEqual(results)
  })

  it.each([
    ['invalid JSON', 'not json {'],
    ['a payload without results', JSON.stringify({})],
    ['an invalid results map', JSON.stringify({ results: { M01: { matchId: 'M01' } } })],
  ])('returns null for %s', (_label, raw) => {
    localStorage.setItem(LEGACY_KEY, raw)
    expect(readLegacyResults()).toBeNull()
  })

  it('clearLegacyResults removes the v1 entry and nothing else', () => {
    localStorage.setItem(LEGACY_KEY, JSON.stringify({ results: {} }))
    localStorage.setItem('other', 'kept')
    clearLegacyResults()
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull()
    expect(localStorage.getItem('other')).toBe('kept')
  })
})

// ---------------------------------------------------------------------------
// exportJson
// ---------------------------------------------------------------------------

describe('exportJson', () => {
  let anchor: HTMLAnchorElement
  let clickSpy: ReturnType<typeof vi.spyOn>
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>
  let fakeUrl: string

  beforeEach(() => {
    fakeUrl = 'blob:fake-url'

    // Capture the real createElement before spying on it, so the mock's
    // fallback branch (for tags other than 'a') delegates to the actual DOM
    // implementation instead of recursing into itself.
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- false positive: only the legacy-tag overloads (HTMLElementDeprecatedTagNameMap) are deprecated, but binding the method selects no overload, so the rule flags the whole symbol
    const originalCreateElement = document.createElement.bind(document)
    anchor = originalCreateElement('a')
    clickSpy = vi.spyOn(anchor, 'click').mockImplementation(() => {})

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return anchor
      return originalCreateElement(tag)
    })

    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue(fakeUrl)
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    // Fix the date so filenames are deterministic
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-29T12:00:00Z'))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('creates an anchor and triggers a click', () => {
    exportJson({})
    expect(clickSpy).toHaveBeenCalledOnce()
  })

  it('does not leave the download anchor attached to the document', () => {
    exportJson({})
    expect(document.body.contains(anchor)).toBe(false)
  })

  it('sets the download filename to wc2026-results-<date>.json', () => {
    exportJson({})
    expect(anchor.download).toBe('wc2026-results-2026-06-29.json')
  })

  it('sets the anchor href to the object URL', () => {
    exportJson({})
    expect(anchor.href).toContain(fakeUrl)
  })

  it('revokes the object URL after the click', () => {
    exportJson({})
    expect(revokeObjectURLSpy).toHaveBeenCalledWith(fakeUrl)
  })

  it('creates a Blob containing the serialised results with the current schema version', () => {
    const results = { M01: validResult('M01') }
    let capturedBlob: Blob | undefined
    createObjectURLSpy.mockImplementation((blob: Blob) => {
      capturedBlob = blob
      return fakeUrl
    })
    exportJson(results)
    expect(capturedBlob).toBeDefined()
    return capturedBlob!.text().then((text) => {
      const parsed = JSON.parse(text)
      expect(parsed.version).toBe(SCHEMA_VERSION)
      expect(parsed.results).toEqual(results)
    })
  })

  it('produces output that parseImport can round-trip', () => {
    const results = { M73: validResult('M73') }
    let capturedBlob: Blob | undefined
    createObjectURLSpy.mockImplementation((blob: Blob) => {
      capturedBlob = blob
      return fakeUrl
    })
    exportJson(results)
    return capturedBlob!.text().then((text) => {
      expect(parseImport(text)).toEqual(results)
    })
  })
})
