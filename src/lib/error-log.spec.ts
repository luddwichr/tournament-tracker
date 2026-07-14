// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ERROR_LOG_KEY, ERROR_LOG_MAX_ENTRIES, logError, readErrorLog, clearErrorLog } from './error-log'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('logError', () => {
  it('appends an entry with time, source and message', () => {
    logError('vue', 'boom')
    const entries = readErrorLog()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ source: 'vue', message: 'boom' })
    expect(new Date(entries[0]!.time).getTime()).not.toBeNaN()
  })

  it('drops the oldest entries beyond the cap', () => {
    for (let i = 0; i < ERROR_LOG_MAX_ENTRIES + 5; i++) {
      logError('window', `error ${i}`)
    }
    const entries = readErrorLog()
    expect(entries).toHaveLength(ERROR_LOG_MAX_ENTRIES)
    expect(entries[0]!.message).toBe('error 5')
    expect(entries.at(-1)!.message).toBe(`error ${ERROR_LOG_MAX_ENTRIES + 4}`)
  })

  it('starts a fresh log when the stored value is corrupt', () => {
    localStorage.setItem(ERROR_LOG_KEY, 'not json {')
    logError('promise', 'after corruption')
    expect(readErrorLog()).toHaveLength(1)
  })

  it('never throws when localStorage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    expect(() => {
      logError('vue', 'boom')
    }).not.toThrow()
  })
})

describe('readErrorLog', () => {
  it('returns an empty log when nothing is stored', () => {
    expect(readErrorLog()).toEqual([])
  })

  it('returns an empty log for a non-array value', () => {
    localStorage.setItem(ERROR_LOG_KEY, JSON.stringify({ foo: 'bar' }))
    expect(readErrorLog()).toEqual([])
  })

  it('filters out malformed entries but keeps valid ones', () => {
    const valid = { time: '2026-07-13T10:00:00.000Z', source: 'boot', message: 'parse error' }
    localStorage.setItem(
      ERROR_LOG_KEY,
      JSON.stringify([valid, { time: 123, source: 'vue', message: 'x' }, { source: 'nope' }, null]),
    )
    expect(readErrorLog()).toEqual([valid])
  })
})

describe('clearErrorLog', () => {
  it('removes the stored log', () => {
    logError('vue', 'boom')
    clearErrorLog()
    expect(readErrorLog()).toEqual([])
    expect(localStorage.getItem(ERROR_LOG_KEY)).toBeNull()
  })
})
