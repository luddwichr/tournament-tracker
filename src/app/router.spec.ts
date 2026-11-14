// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { router, scrollBehavior } from './router'
import { allGroupResults } from '../test-support/results'
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

async function routeAt(path: string) {
  await router.push(path)
  return router.currentRoute.value
}

describe('scrollBehavior', () => {
  it('restores the saved position on back and forward', async () => {
    const [ranking, groups] = [await routeAt('/ranking'), await routeAt('/groups')]
    expect(scrollBehavior(groups, ranking, { left: 0, top: 640 })).toEqual({ left: 0, top: 640 })
  })

  it('scrolls to the hash target', async () => {
    const [groups, skipLinkTarget] = [await routeAt('/groups'), await routeAt('/groups#main')]
    expect(scrollBehavior(skipLinkTarget, groups, null)).toEqual({ el: '#main' })
  })

  it('starts a fresh navigation at the top', async () => {
    const [groups, ranking] = [await routeAt('/groups'), await routeAt('/ranking')]
    expect(scrollBehavior(ranking, groups, null)).toEqual({ top: 0 })
  })
})
