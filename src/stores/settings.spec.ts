import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createApp, nextTick } from 'vue'
import { useSettingsStore } from './settings'

// Pinia only activates plugins queued via `pinia.use(...)` once the pinia
// instance is actually installed into an app (mirrors main.ts's
// `createApp(App).use(pinia)`) — merely calling `setActivePinia` skips that
// step, so the persistedstate plugin would silently never hydrate/persist.
function createPersistedPinia() {
  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)
  createApp({}).use(pinia)
  return pinia
}

describe('settings store', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPersistedPinia())
  })

  it('defaults to light theme', () => {
    const store = useSettingsStore()
    expect(store.theme).toBe('light')
  })

  // The store's one real piece of behavior is `persist: true` — everything
  // else here is Pinia/Vue ref semantics, not this store's logic.
  it('persists theme changes to localStorage under the store id key', async () => {
    const store = useSettingsStore()
    store.theme = 'dark'
    // The plugin persists via a `$subscribe` watcher, which flushes on the
    // next tick rather than synchronously.
    await nextTick()
    expect(JSON.parse(localStorage.getItem('settings')!)).toEqual({ theme: 'dark' })
  })

  it('rehydrates the theme from localStorage when the store is created', () => {
    localStorage.setItem('settings', JSON.stringify({ theme: 'dark' }))
    const store = useSettingsStore()
    expect(store.theme).toBe('dark')
  })
})
