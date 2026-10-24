import { describe, expect, it } from 'vitest'
import { boundedCache } from './bounded-cache'

describe('boundedCache', () => {
  it('evicts only the oldest entry once it is full', () => {
    const cache = boundedCache<string, number>(2)
    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)

    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBe(2)
    expect(cache.get('c')).toBe(3)
  })

  it('drops every entry on clear', () => {
    const cache = boundedCache<string, number>(2)
    cache.set('a', 1)
    cache.clear()

    expect(cache.get('a')).toBeUndefined()
  })
})
