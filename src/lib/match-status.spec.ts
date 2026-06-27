import { describe, it, expect, vi, afterEach } from 'vitest'
import { getMatchStatus } from './match-status'

afterEach(() => {
  vi.useRealTimers()
})

const FUTURE = '2099-06-15T20:00:00+02:00'
const PAST = '2020-06-15T20:00:00+02:00'

describe('getMatchStatus', () => {
  it('returns finished when a result is present regardless of kickoff', () => {
    expect(getMatchStatus(FUTURE, true)).toBe('finished')
    expect(getMatchStatus(PAST, true)).toBe('finished')
  })

  it('returns upcoming when kickoff is in the future and no result', () => {
    vi.useFakeTimers({ now: new Date('2020-01-01T00:00:00Z') })
    expect(getMatchStatus(FUTURE, false)).toBe('upcoming')
  })

  it('returns live when kickoff has passed and no result', () => {
    vi.useFakeTimers({ now: new Date('2030-01-01T00:00:00Z') })
    expect(getMatchStatus(PAST, false)).toBe('live')
  })

  it('returns live exactly at kickoff moment', () => {
    const kickoff = '2026-06-15T18:00:00Z'
    vi.useFakeTimers({ now: new Date(kickoff) })
    expect(getMatchStatus(kickoff, false)).toBe('live')
  })

  it('returns upcoming one millisecond before kickoff', () => {
    const kickoff = '2026-06-15T18:00:00Z'
    vi.useFakeTimers({ now: new Date(new Date(kickoff).getTime() - 1) })
    expect(getMatchStatus(kickoff, false)).toBe('upcoming')
  })
})
