import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Result } from '../types/tournament'
import { parseImport, exportJson } from './persistence'
import { makeResult } from '../test-support/results'

function validResult(matchId: string, extra: Partial<Result> = {}): Result {
  return makeResult(matchId, 1, 0, extra)
}

function serialise(results: Record<string, Result>): string {
  return JSON.stringify({ version: 1, results })
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
    const json = JSON.stringify({ version: 99, results: {} })
    expect(() => parseImport(json)).toThrow()
  })

  it('throws on missing results key', () => {
    const json = JSON.stringify({ version: 1 })
    expect(() => parseImport(json)).toThrow()
  })

  it('throws on a non-object results value', () => {
    const json = JSON.stringify({ version: 1, results: 'bad' })
    expect(() => parseImport(json)).toThrow()
  })

  it('throws when a result is missing required numeric fields', () => {
    const bad = { matchId: 'M01', homeGoals: 1, awayGoals: 0 } // missing card fields
    const json = JSON.stringify({ version: 1, results: { M01: bad } })
    expect(() => parseImport(json)).toThrow()
  })
})

// ---------------------------------------------------------------------------
// exportJson
// ---------------------------------------------------------------------------

describe('exportJson', () => {
  let anchor: HTMLAnchorElement
  let appendSpy: ReturnType<typeof vi.spyOn>
  let removeSpy: ReturnType<typeof vi.spyOn>
  let clickSpy: ReturnType<typeof vi.spyOn>
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>
  let fakeUrl: string

  beforeEach(() => {
    fakeUrl = 'blob:fake-url'
    anchor = document.createElement('a')
    clickSpy = vi.spyOn(anchor, 'click').mockImplementation(() => {})

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') return anchor
      return document.createElement(tag)
    })

    appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => anchor)
    removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => anchor)

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

  it('appends and then removes the anchor from the body', () => {
    exportJson({})
    expect(appendSpy).toHaveBeenCalledWith(anchor)
    expect(removeSpy).toHaveBeenCalledWith(anchor)
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

  it('creates a Blob containing the serialised results with version:1', () => {
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
      expect(parsed.version).toBe(1)
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
