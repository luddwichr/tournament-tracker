// State machine behind the sync dialog: confirm → syncing → done | error,
// with cancellation. Hands mapped results to `apply` on success.

import type { ResultsMap } from '../types/tournament'
import { ref } from 'vue'
import { syncResults } from '../lib/results-sync'

export type SyncStatus = 'idle' | 'confirm' | 'syncing' | 'done' | 'error'

export function useResultsSync(apply: (results: ResultsMap) => void) {
  const status = ref<SyncStatus>('idle')
  const error = ref<string | null>(null)
  const count = ref(0)
  let controller: AbortController | null = null

  /** Open the confirmation step. */
  function open(): void {
    error.value = null
    status.value = 'confirm'
  }

  /** Cancel any in-flight request and close. */
  function cancel(): void {
    controller?.abort()
    controller = null
    status.value = 'idle'
  }

  /** Run (or retry) the sync. */
  async function run(): Promise<void> {
    controller?.abort()
    const ctrl = new AbortController()
    controller = ctrl
    error.value = null
    status.value = 'syncing'
    try {
      const results = await syncResults({ signal: ctrl.signal })
      if (ctrl.signal.aborted) return
      apply(results)
      // The store is replaced wholesale, so the fetched-map size is the count the dialog reports.
      count.value = Object.keys(results).length
      status.value = 'done'
    } catch (e) {
      if (ctrl.signal.aborted) return
      error.value = e instanceof Error ? e.message : 'Abruf fehlgeschlagen.'
      status.value = 'error'
    }
  }

  return { cancel, count, error, open, run, status }
}
