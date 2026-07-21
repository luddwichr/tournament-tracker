export interface BoundedCache<K, V> {
  get(key: K): V | undefined
  set(key: K, value: V): void
  clear(): void
}

/**
 * A `Map`-backed cache with a fixed maximum size and FIFO eviction.
 * Once `max` entries are stored, inserting a new key drops the oldest.
 * A `Map` preserves insertion order, so the first key is always the oldest entry.
 * That lets this evict only the oldest entry instead of clearing the whole cache.
 *
 * This suits memoizing pure derivations keyed on their inputs.
 * A stale entry can only ever be returned for identical inputs, which is the correct result.
 * So eviction is a memory bound, never a correctness concern.
 */
export function boundedCache<K, V>(max: number): BoundedCache<K, V> {
  const map = new Map<K, V>()
  return {
    clear() {
      map.clear()
    },
    get(key) {
      return map.get(key)
    },
    set(key, value) {
      if (map.size >= max) {
        const oldestKey = map.keys().next().value
        if (oldestKey !== undefined) map.delete(oldestKey)
      }
      map.set(key, value)
    },
  }
}
