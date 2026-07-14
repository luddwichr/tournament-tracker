import { ref, provide, inject } from 'vue'
import type { InjectionKey, Ref } from 'vue'
import type { MatchSlot, Team } from '../types/tournament'

export interface ScoreDialogConfig {
  match: MatchSlot
  home: Team
  away: Team
}

type OpenFn = (match: MatchSlot, home: Team, away: Team) => void

export const scoreDialogKey: InjectionKey<OpenFn> = Symbol('score-dialog')

export interface ScoreDialogState {
  config: Ref<ScoreDialogConfig | null>
  close: () => void
}

export function provideScoreDialog(): ScoreDialogState {
  const config = ref<ScoreDialogConfig | null>(null)

  function open(match: MatchSlot, home: Team, away: Team): void {
    config.value = { away, home, match }
  }

  function close(): void {
    config.value = null
  }

  provide(scoreDialogKey, open)

  return { close, config }
}

const noop: OpenFn = () => undefined

export function useScoreDialog(): OpenFn {
  return inject(scoreDialogKey, noop)
}
