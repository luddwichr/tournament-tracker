import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Result } from '../types/tournament'
import { nextTick } from 'vue'
import { syncResults } from '../lib/results-sync'
import { useResultsSync } from './use-results-sync'

vi.mock('../lib/results-sync', () => ({ syncResults: vi.fn() }))

const result = (matchId: string): Result => ({
  awayGoals: 0,
  awayRed: 0,
  awayYellow: 0,
  homeGoals: 1,
  homeRed: 0,
  homeYellow: 0,
  matchId,
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useResultsSync', () => {
  it('open() enters the confirm state', () => {
    const sync = useResultsSync(vi.fn())
    sync.open()
    expect(sync.status.value).toBe('confirm')
  })

  it('run() applies results and reports done with a count', async () => {
    const apply = vi.fn()
    const results = { M01: result('M01'), M02: result('M02') }
    vi.mocked(syncResults).mockResolvedValue(results)

    const sync = useResultsSync(apply)
    await sync.run()

    expect(apply).toHaveBeenCalledWith(results)
    expect(sync.status.value).toBe('done')
    expect(sync.count.value).toBe(2)
  })

  it('surfaces a failure message', async () => {
    vi.mocked(syncResults).mockRejectedValue(new Error('Netzfehler'))
    const sync = useResultsSync(vi.fn())
    await sync.run()
    expect(sync.status.value).toBe('error')
    expect(sync.error.value).toBe('Netzfehler')
  })

  it('falls back to a generic message for non-Error rejections', async () => {
    vi.mocked(syncResults).mockRejectedValue('boom')
    const sync = useResultsSync(vi.fn())
    await sync.run()
    expect(sync.error.value).toBe('Abruf fehlgeschlagen.')
  })

  it('cancel() aborts an in-flight sync without applying results', async () => {
    const apply = vi.fn()
    vi.mocked(syncResults).mockImplementation(
      (_provider, opts) =>
        new Promise((_resolve, reject) => {
          opts?.signal?.addEventListener('abort', () => {
            reject(new Error('aborted'))
          })
        }),
    )

    const sync = useResultsSync(apply)
    const running = sync.run()
    await nextTick()
    expect(sync.status.value).toBe('syncing')

    sync.cancel()
    expect(sync.status.value).toBe('idle')

    await running
    expect(apply).not.toHaveBeenCalled()
    expect(sync.status.value).toBe('idle')
  })

  it('ignores a success that resolves after cancellation', async () => {
    const apply = vi.fn()
    let finish!: () => void
    vi.mocked(syncResults).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = () => {
            resolve({ M01: result('M01') })
          }
        }),
    )

    const sync = useResultsSync(apply)
    const running = sync.run()
    await nextTick()

    sync.cancel()
    finish()
    await running

    expect(apply).not.toHaveBeenCalled()
    expect(sync.status.value).toBe('idle')
  })

  it('cancel() closes the confirm step', () => {
    const sync = useResultsSync(vi.fn())
    sync.open()
    sync.cancel()
    expect(sync.status.value).toBe('idle')
  })

  it('retrying after an error can succeed', async () => {
    const apply = vi.fn()
    vi.mocked(syncResults)
      .mockRejectedValueOnce(new Error('Netzfehler'))
      .mockResolvedValueOnce({ M01: result('M01') })

    const sync = useResultsSync(apply)
    await sync.run()
    expect(sync.status.value).toBe('error')

    await sync.run()
    expect(sync.status.value).toBe('done')
    expect(apply).toHaveBeenCalledOnce()
  })
})
