// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { allGroupResults } from '../test-support/results'
import { router } from './router'
import { useTournamentStore } from '../stores/tournament'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('router', () => {
  it('redirects / to /groups while group results are still missing', async () => {
    await router.push('/')
    expect(router.currentRoute.value.path).toBe('/groups')
  })

  it('redirects / to /knockout once every group match has a result', async () => {
    const tournament = useTournamentStore()
    tournament.importResults(allGroupResults())

    await router.push('/')
    expect(router.currentRoute.value.path).toBe('/knockout')
  })
})
