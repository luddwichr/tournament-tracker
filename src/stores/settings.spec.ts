import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsStore } from './settings'

describe('settings store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('defaults to light theme', () => {
    const store = useSettingsStore()
    expect(store.theme).toBe('light')
  })

  it('can be switched to dark theme', () => {
    const store = useSettingsStore()
    store.theme = 'dark'
    expect(store.theme).toBe('dark')
  })

  it('can be switched back to light theme', () => {
    const store = useSettingsStore()
    store.theme = 'dark'
    store.theme = 'light'
    expect(store.theme).toBe('light')
  })

  it('two stores from the same pinia share reactive state', () => {
    const a = useSettingsStore()
    const b = useSettingsStore()
    a.theme = 'dark'
    expect(b.theme).toBe('dark')
  })
})
