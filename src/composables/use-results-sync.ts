// State machine behind the sync dialog: confirm → syncing → done | error,
// with cancellation. Hands mapped results to `apply` on success.

import { ref } from 'vue'
import type { Result } from '../types/tournament'
import { syncResults } from '../lib/results-sync'

export type SyncStatus = 'idle' | 'confirm' | 'syncing' | 'done' | 'error'

export function useResultsSync(apply: (results: Record<string, Result>) => void) {
  const status = ref<SyncStatus>('idle')
  const progress = ref<{ done: number; total: number } | null>(null)
  const error = ref<string | null>(null)
  const count = ref(0)
  let controller: AbortController | null = null

  /** Open the confirmation step. */
  function open(): void {
    error.value = null
    progress.value = null
    status.value = 'confirm'
  }

  /** Cancel any in-flight request and close. */
  function cancel(): void {
    controller?.abort()
    controller = null
    progress.value = null
    status.value = 'idle'
  }

  /** Run (or retry) the sync. */
  async function run(): Promise<void> {
    controller?.abort()
    const ctrl = new AbortController()
    controller = ctrl
    error.value = null
    progress.value = null
    status.value = 'syncing'
    try {
      const results = await syncResults(undefined, {
        signal: ctrl.signal,
        onProgress: (done, total) => {
          if (!ctrl.signal.aborted) progress.value = { done, total }
        },
      })
      if (ctrl.signal.aborted) return
      apply(results)
      count.value = Object.keys(results).length
      status.value = 'done'
    } catch (e) {
      if (ctrl.signal.aborted) return
      error.value = e instanceof Error ? e.message : 'Abruf fehlgeschlagen.'
      status.value = 'error'
    } finally {
      if (controller === ctrl) progress.value = null
    }
  }

  return { status, progress, error, count, open, run, cancel }
}
