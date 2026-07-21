import { computed, onUnmounted, ref } from 'vue'
import type { Result } from '../types/tournament'
import { syncResults } from '../lib/results-sync'

export type FetchLiveStatus = 'idle' | 'loading' | 'success' | 'not-found' | 'error'

/**
 * Fetches the whole results feed and hands this match's entry to `onResult` for review.
 * Nothing is written to the store, so there is nothing to warn about overwriting.
 * The request is aborted on unmount, so one still in flight can't later fill a closed dialog.
 */
export function useLiveResultFetch(matchId: () => string, onResult: (result: Result) => void, scoreText: () => string) {
  const status = ref<FetchLiveStatus>('idle')
  const error = ref<string | null>(null)
  const controller = new AbortController()
  onUnmounted(() => {
    controller.abort()
  })

  /**
   * Visible confirmation for `success` and `not-found`, so the outcome stays perceivable.
   * That matters while `announce()`'s global `role="status"` region is inert.
   * It lives outside the modal `<dialog>`, which `showModal()` makes `inert`.
   * This is empty for `idle`, `loading` and `error`, since `error` has its own `role="alert"` element instead.
   */
  const message = computed(() => {
    if (status.value === 'success') return `Live-Ergebnis übernommen: ${scoreText()}.`
    if (status.value === 'not-found') return 'Kein Live-Ergebnis gefunden.'
    return ''
  })

  async function run(): Promise<void> {
    status.value = 'loading'
    error.value = null
    try {
      const results = await syncResults({ signal: controller.signal })
      const result = results[matchId()]
      if (!result) {
        status.value = 'not-found'
        return
      }
      onResult(result)
      status.value = 'success'
    } catch (e) {
      if (controller.signal.aborted) return
      error.value = e instanceof Error ? e.message : 'Abruf fehlgeschlagen.'
      status.value = 'error'
    }
  }

  return { error, message, run, status }
}
