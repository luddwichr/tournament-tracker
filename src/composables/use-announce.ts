import type { InjectionKey } from 'vue'
import { inject } from 'vue'

export const announceKey: InjectionKey<(msg: string) => void> = Symbol('announce')

export function useAnnounce(): (msg: string) => void {
  return inject(announceKey, () => {})
}
