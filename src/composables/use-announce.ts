import type { InjectionKey, Ref } from 'vue'
import { inject, nextTick, provide, ref } from 'vue'

export const announceKey: InjectionKey<(msg: string) => void> = Symbol('announce')

export interface AnnounceState {
  /** Bind this to the app's persistent visually-hidden `role="status"` region. */
  announcement: Ref<string>
  announce: (msg: string) => void
}

export function provideAnnounce(): AnnounceState {
  const announcement = ref('')

  function announce(msg: string): void {
    // Clear then set on next tick so the same message can be re-announced.
    announcement.value = ''
    void nextTick(() => {
      announcement.value = msg
    })
  }

  provide(announceKey, announce)

  return { announce, announcement }
}

export function useAnnounce(): (msg: string) => void {
  return inject(announceKey, () => {})
}
